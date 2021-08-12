
export const CONFIG_VERSION = 1000;

interface Testcase {
    input: string;
    answer: string;
}

interface Problem {
    /**
     * version number of this definition
     * 
     * will add 1000 when making a breaking change
     */
    version: number;
    /**
     * unique id of this problem
     * 
     * separate id using `:` to mark a namespace
     * 
     * recommended to use [a-z0-9/-] only to make a good id
     * 
     * @example etheroj:example/hello-world
     * @example etheroj:p1001
     */
    id: string;
    /** readable name of the problem */
    name: string;
    /** readable source of the problem */
    source?: string;
    /** 
     * description of problem
     * 
     * can be the problem body or a link to the problem body
     */
    description?: string;
    /** 
     * time limitation for a single test case run, in milliseconds 
     * @default 2048 
     */
    timeLimit?: number;
    /** 
     * space limitation for a single test case run, in MB 
     * @default 128 
     */
    spaceLimit?: number;
    /**
     * path to one or more possible solution files
     * 
     * use key to match languages like `cpp`, `python`
     * @example 
     * {
     *     "python": "solution.py",
     *     "cpp": "solution.cpp"
     * }
     * 
     * @example "solution.cpp"
     */
    solution?: Record<string, string> | string;
    testcases?: Testcase[];
    /**
     * in which environment shall this problem to be used
     * 
     * Add a `!` if you want to disable some defaultly enabled environments
     * 
     * for some environments (that is enabled by default), 
     * if no theirs flags were defined in target, 
     * they will simply skip this problem when it does not contain all required
     * data, but if you explicitly define their flags, they will fail.
     * 
     * @example ['!test', 'playground'] // skip tests and can run in playground
     */
    target?: string[]
    /**
     * additional data.
     */
    config?: Record<string, unknown>;
}

export type { Testcase, Problem };