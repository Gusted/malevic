const gulp = require('gulp');
const path = require('path');
const rename = require('gulp-rename');
const merge = require('merge-stream');
const source = require('vinyl-source-stream');
const rollup = require('rollup-stream');
const typescript = require('@alexlur/rollup-plugin-typescript');
const uglify = require('rollup-plugin-uglify');
const less = require('gulp-less');
const cssmin = require('gulp-cssmin');
const autoprefix = require('gulp-autoprefixer');
const package = require('./package');

const date = (new Date()).toLocaleDateString('en-us', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const banner = `/* ${package.name}@${package.version} - ${date} */`;

function buildJS(options, { output, ts = {}, minify = false } = {}) {
    const dir = path.dirname(output);
    const file = path.basename(output);
    const stream = rollup(Object.assign({
        strict: true,
        format: 'umd',
        banner,
        rollup: require('rollup'),
        plugins: [
            typescript(Object.assign({
                typescript: require('typescript'),
                removeComments: true
            }, ts)),
            minify ? uglify({
                output: { preamble: banner }
            }) : null
        ].filter((p) => p)
    }, options));

    return stream
        .pipe(source(file))
        .pipe(gulp.dest(dir));
}

function buildCSS({ input, output, minify = false }) {
    const dir = path.dirname(output);
    const file = path.basename(output);
    let stream = gulp.src(input)
        .pipe(less())
        .pipe(autoprefix({
            browsers: ['last 2 versions']
        }))
        .pipe(rename(file));
    if (minify) {
        stream = stream.pipe(cssmin());
    }
    return stream
        .pipe(gulp.dest(dir));
}

function buildPackage({ es2015, umd, min, global, plugin }) {
    const extend = plugin ? Object.assign(obj, {
        external: ['malevic'],
        globals: { 'malevic': 'Malevic' }
    }) : (obj) => obj;
    return [
        buildJS(extend({
            input: es2015[0],
            format: 'es',
        }), { output: es2015[1], ts: { target: 'es2015' } }),
        buildJS(extend({
            input: umd[0],
            format: 'umd',
            name: global
        }), { output: umd[1], ts: { target: 'es5' } }),
        buildJS(extend({
            input: min[0],
            format: 'umd',
            name: global
        }), { output: min[1], minify: true, ts: { target: 'es5' } }),
    ];
}

gulp.task('default', () => {
    merge(

        ...buildPackage({
            global: 'Malevic',
            es2015: [
                './entries/index.ts',
                './index.js'
            ],
            umd: [
                './entries/index-umd.ts',
                './umd/index.js'
            ],
            min: [
                './entries/index-umd.ts',
                './umd/index.min.js'
            ]
        }),
        ...buildPackage({
            global: 'Malevic.Animation',
            es2015: [
                './entries/animation.ts',
                './animation.js'
            ],
            umd: [
                './entries/animation-umd.ts',
                './umd/animation.js'
            ],
            min: [
                './entries/animation-umd.ts',
                './umd/animation.min.js'
            ]
        }),
        ...buildPackage({
            global: 'Malevic.Forms',
            es2015: [
                './entries/forms.ts',
                './forms.js'
            ],
            umd: [
                './entries/forms.ts',
                './umd/forms.js'
            ],
            min: [
                './entries/forms.ts',
                './umd/forms.min.js'
            ]
        }),
        ...buildPackage({
            global: 'Malevic.Controls',
            es2015: [
                './entries/controls.ts',
                './controls.js'
            ],
            umd: [
                './entries/controls.ts',
                './umd/controls.js'
            ],
            min: [
                './entries/controls.ts',
                './umd/controls.min.js'
            ]
        }),
        buildCSS({
            input: './entries/controls.less',
            output: './umd/controls.css'
        }),
        buildCSS({
            input: './entries/controls.less',
            output: './umd/controls.min.css',
            minify: true
        })
    );
});

gulp.task('build-examples', () => {
    merge(
        buildJS(
            {
                input: './examples/examples.tsx',
                format: 'iife',
                exports: 'none',
                sourcemap: 'inline'
            },
            {
                output: './examples/examples.js',
                ts: {
                    target: 'es5',
                    jsx: 'react',
                    jsxFactory: 'html'
                }
            }),
        buildCSS({
            input: './examples/style.less',
            output: './examples/style.css'
        })
    );
});
