
export const CONFIG_VERSION = 2;

interface Testcase {
    input: string;
    answer: string;
}

interface TestConfig {
    version: number;
    name: string;
    description: string;
    source: string;
    /** 
     * indicates time limitation for a single test case run, in milliseconds 
     * @default 2048 
     */
    timeLimit?: number;
    /** 
     * indicates space limitation for a single test case run, in MB 
     * @default 128 
     */
    spaceLimit?: number;
    /**
     * path to one or more possible solution files
     * use key to match languages like `cpp`, `python`
     */
    solution?: Record<string, string> | string;
    testcases?: Testcase[];
    /**
     * definitions usage scope.
     * the key is internally defined by applications using definition
     * eg. { "test": false } disables tester.
     */
    target: Record<string, string | boolean>;
    meta: Record<string, unknown>;
}

export type { Testcase, TestConfig };
