'use strict';

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from '@actions/glob';
import * as util from 'util';
import * as child_process from 'child_process';

import Test from './test';

const execw = util.promisify(child_process.exec);
const execr = async function(args) {
    return (await execw(args)).stdout.trim();
};

(async () => {
    core.startGroup('Collect Environment Data');
    const vlibjudger = await execr(`${__dirname}/libjudger.so --version`);
    const vcompiler = (await execr('g++ --version')).split('\n')[0];
    const context = github.context;
    const targetPattern = core.getInput('target');

    const env = {
        timestamp: +new Date(),
        judger: context.action,
        sha: context.sha,
        libjudger_version: vlibjudger,
        gcc_version: vcompiler,
        repository: context.repo,
        target_pattern: targetPattern,
    };
    console.log(env);
    core.endGroup();

    const globber = await glob.create(targetPattern);
    let [passed, total] = [0, 0];
    for await (const file of globber.globGenerator()) {
        const tester = new Test(file);
        const report = await tester.test();
        total++;
        if (report.result == 0) passed++;
    }
    
    if (passed === total) {
        core.info(`\x1b[1;92m✓ All tests completed with ${passed} of ${total} tests passed.`);
    } else {
        core.setFailed(`✘ All tests completed with ${passed} of ${total} tests passed.`);
    }
})();