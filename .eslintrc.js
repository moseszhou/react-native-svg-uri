const config = {
  extends: [ 'airbnb', 'airbnb/hooks', 'prettier'],
  parser: '@babel/eslint-parser',
  plugins: ['react', 'prettier'],
  rules: {
    'no-unused-vars': [
      'error',
      {
        varsIgnorePattern: 'Taro|React'
      }
    ],
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['.js', '.jsx', '.tsx']
      }
    ],
    'no-unused-expressions': [
      2,
      {
        allowShortCircuit: true, // 允许短路运算符
        allowTernary: true, // 允许三目运算符
        allowTaggedTemplates: true // 允许`纯字符串`
      }
    ],
    // 禁用强制没有使用this指针的方法必须定义为静态方法的检查
    'class-methods-use-this': 0,
    'react/react-in-jsx-scope': 0,
    'no-console': 0,
    // 禁用单行最大字符数检查
    'max-len': [2, 150],
    // 类型转换的基数参数必要时才传, 如: 使用 parseInt('2') 而不是 parseInt('2', 10)
    radix: [2, 'as-needed'],
    // 禁用带下划线变量名检查
    'no-underscore-dangle': 0,
    // 禁用 ++ -- 检查
    'no-plusplus': 0,
    // 禁用 continue
    'no-continue': 0,
    'func-names': 0,
    // 禁用es6精简语法检查, 如: {a,b,c}
    'object-shorthand': 0,
    // 禁用模板语法代替字符串拼接语法检查, 如: `Hello, ${name}`
    // "prefer-template": 0,
    // 禁用props必须定义propTypes检查
    'react/prop-types': 0,
    // 禁用require不允许出现在作用域内部的检查
    'global-require': 0,
    // 禁用变量在定义前使用检查(规避styles总是在文件末尾定义的问题)
    // "no-use-before-define": 0,
    // 要求使用一致的 return 语句
    'consistent-return': 0,
    // 单个文件中的class个数限制
    'max-classes-per-file': ['error', 2],
    // 禁止必须使用结构赋值
    'react/destructuring-assignment': 0,
    // jsx使用bind或箭头函数会在每次render时创建一个函数, 增加开销, 故而除了refs外均禁止使用bind或箭头函数
    'react/jsx-no-bind': [
      2,
      {
        ignoreRefs: true,
        allowArrowFunctions: true
      }
    ],
    // Prevent multiple component definition per file
    // https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/no-multi-comp.md
    'react/no-multi-comp': [
      0,
      {
        ignoreStateless: true
      }
    ],
    // Do not use Array index in keys
    'react/no-array-index-key': 0,
    // 禁止jsx属性扩展<Component {...props} />
    'react/jsx-props-no-spreading': 0,
    // 禁用变量在定义前使用检查(规避styles总是在文件末尾定义的问题)
    'no-use-before-define': 0,
    'react/static-property-placement': 0,
    // 禁用函数参数重用检查
    'no-param-reassign': 0,

    // 析构可以不进行const检查
    'prefer-const': [
      'error',
      {
        destructuring: 'all',
        ignoreReadBeforeAssign: false
      }
    ],
    'prefer-destructuring': [
      'error',
      {
        'VariableDeclarator': {
          'array': false,
          'object': true
        },
        'AssignmentExpression': {
          'array': false,
          'object': false
        }
      }
    ],
    'jsx-quotes': ['error', 'prefer-single'],
    'camelcase': ['off'],
    'no-nested-ternary': ['off'],
    'prettier/prettier': 'error',
    'import/no-extraneous-dependencies': ['off'],
    'react/jsx-uses-react': 'off',
    'import/no-unresolved': ['error', { ignore: ['^@slot/'] }], // 忽略@slot/引入检测
    'import/extensions': [
      // 忽略ts后缀检测
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never'
      }
    ],
    'import/prefer-default-export': ['off'],
    'react/no-deprecated': ['off'],
    'react/no-unused-class-component-methods': ['off'],
    'arrow-body-style': ['off']
  }
}

module.exports = config
