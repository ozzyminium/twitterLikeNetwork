const path = require('path');

module.exports = {
    entry:{ 
        home: './network/static/network/src/home.js',
        index: './network/static/network/src/index.js',
        profile: './network/static/network/src/profile.js',
    },
    output: {
        path: path.resolve(__dirname, 'network/static/network/dist'),
        filename: '[name].production.min.js'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
};

