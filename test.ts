'use strict';

import * as core from '@actions/core';
import * as YAML from 'yaml';
import { PathLike, readFileSync } from 'fs';
import * as util from 'util';
import * as path from 'path';
import * as tmp from 'tmp';
import * as child_process from 'child_process';
import { promises as fs } from 'fs';

const execw = util.promisify(child_process.exec);
const execr = async function (args) {
    return (await execw(args)).stdout.trim();
};

interface Testcase {
    input: string;
    answer?: string;
    specialJudge?: string;
}

interface TestConfig {
    name: string;
    description: string;
    source: string;
    filepath: string;
    timeLimit: number;
    spaceLimit: number;
    solution: string;
    compileArgs: string;
    testcases: Testcase[];
}

export enum TestResult {
    // fail-fast results
    ACCEPTED = 0,
    UNACCEPTED = -1,
    COMPILATION_ERROR = -2,
    // detailed results
    CPU_TIME_LIMIT_EXCEEDED = 1,
    TIME_LIMIT_EXCEEDED = 2,
    SPACE_LIMIT_EXCEEDED = 3,
    RUNTIME_ERROR = 4,
    SYSTEM_ERROR = 5,
    WRONG_ANSWER = 6,
}

interface TestReport {
    result: TestResult;
    used_time?: number;
    used_space?: number;
    message?: string;
    children?: TestReport[];
}

class Test {
    private config: TestConfig;
    private executable: string;

    constructor(configPath: PathLike) {
        const cfg = YAML.parse(readFileSync(configPath).toString());
        this.config = cfg;

        this.config.filepath = configPath.toString();
        this.config.spaceLimit ??= 128;
        this.config.timeLimit ??= 2048;
        this.config.testcases ??= [];
        delete this.config.description;
    }

    async test(): Promise<TestReport> {
        return await core.group(this.shortPath(), async () => {
            core.info('\x1b[1;34m- parse infomation');
            console.log(this.config);

            try {
                this.executable = await this.compile();
            } catch (e) {
                core.error(`${this.shortPath()}: ${e}`);
                return {
                    result: TestResult.COMPILATION_ERROR,
                };
            }

            let reports;
            try {
                reports = await this.testAllCases();
            } catch (e) {
                core.error(`${this.shortPath()}: ${e}`);
                return {
                    result: TestResult.SYSTEM_ERROR,
                };
            }

            let totalTime = 0;
            let maxSpace = 0;
            let failed = 0;

            for (const i of reports) {
                if (i.result != TestResult.ACCEPTED) failed++;
                totalTime += i.used_time ?? 0;
                maxSpace = Math.max(maxSpace, i.used_space ?? 0);
            }

            const logFn = failed ? core.error : core.info;
            const color = failed ? '' : '\x1b[1;32m';
            logFn.call(core, `${color}${this.shortPath()}:\n` +  
                `\t${color}${reports.length - failed} of ${reports.length} tests passed.`);

            return {
                result: failed ? TestResult.UNACCEPTED : TestResult.ACCEPTED,
                used_time: totalTime,
                used_space: maxSpace,
                children: reports,
            } as TestReport;
        });
    }

    private shortPath() : string {
        const dir = process.cwd();
        return this.config.filepath.replace(`${dir}/`, '');
    }

    private async compile() : Promise<string> {
        core.info('\x1b[1;34m- compile solution file');
        const solPath = path.resolve(this.config.solution);
        const tmpFile = tmp.tmpNameSync();
        const out = await execr(`g++ ${this.config.compileArgs ?? ''} -o ${tmpFile} ${solPath}`);
        console.log(out);

        return tmpFile;
    }

    private async testAllCases(): Promise<TestReport[]> {
        core.info('\x1b[1;34m- run tests begin');
        if (this.config.testcases.length === 0) {
            console.log('no test cases provided.');
            return [];
        }

        const reports: TestReport[] = [];
        for (const i in this.config.testcases) {
            const kase = this.config.testcases[i];
            let report : TestReport;
            try {
                core.info(`\x1b[1;34m\t- run test #${i}`);
                const result = await this.testCase(kase);
                report = result;
            } catch (e) {
                report = {
                    result: TestResult.SYSTEM_ERROR,
                    used_time: 0,
                    used_space: 0,
                    message: e,
                };
            }
            if (report.result !== TestResult.ACCEPTED) {
                core.error(
                    `${this.shortPath()}: test #${i}: ${TestResult[report.result]}\n` + 
                    JSON.stringify(report, null, 2));
            }
            reports.push(report);
        }
        
        core.info('\x1b[1;34m- run tests end');
        return reports;
    }

    private async testCase(t: Testcase): Promise<TestReport> {
        const inf = path.resolve(t.input);
        const anf = path.resolve(t.answer);
        const ouf = tmp.tmpNameSync();

        const args = [
            `--exe_path=${this.executable}`,
            `--input_path=${inf}`,
            `--output_path=${ouf}`,
            `--error_path=${ouf}`,
            `--max_output_size=${134217728}`,
            `--max_real_time=${this.config.timeLimit}`,
            `--max_memory=${this.config.spaceLimit * 1048576}`
        ];

        let report: TestReport;
        try {
            const cmd = `sudo ${__dirname}/libjudger.so ${args.join(' ')}`;
            const result = JSON.parse(await execr(cmd));
            report = {
                result: result.result,
                message: result,
                used_time: result.real_time,
                used_space: result.memory,
            };
        } catch (e) {
            return {
                result: TestResult.SYSTEM_ERROR,
                message: e,
            } as TestReport;
        }

        if (report.result === TestResult.ACCEPTED) {
            const ansc = (await fs.readFile(anf)).toString();
            const outc = (await fs.readFile(ouf)).toString();
            const diff = this.diff(ansc, outc);
            if (diff) {
                report.result = TestResult.WRONG_ANSWER;
                report.message = diff;
            }
        }
        return report;
    }

    private diff(istr: string, astr: string): string | null {
        [istr, astr] = [istr.trim(), astr.trim()];
        let ln = 1, col = 1;
        for (let i = 0; i < istr.length; i++) {
            if (i >= astr.length) {
                return 'Unexpected EOF while reading answer.';
            }
            if (istr[i] !== astr[i]) {
                return `Expected ${escape(astr[i])} but found ${escape(istr[i])} at ${ln}:${col}`;
            }
            if (istr[i] === '\n') [ln, col] = [ln + 1, 1];
            else col++;
        }
        if (istr.length !== astr.length) {
            return 'Unexpected EOF while reading output.';
        }

        return null;
    }
}

export default Test;