module.exports = {
    'root': true,
    'env': {
        'node': true,
        'es6': true
    },
    'parser': '@typescript-eslint/parser',
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    'parserOptions': {
        'ecmaVersion': 11
    },
    'rules': {
        'indent': [
            'error',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        "semi": "off",
        "@typescript-eslint/semi": ["error"],
    }
};
