const gulp = require('gulp')
const webpack = require('webpack-stream')
const pug = require('gulp-pug')
const pugbem = require('gulp-pugbem')
const prettyHtml = require('gulp-pretty-html')
const sass = require('gulp-sass')
const autoprefixer = require('gulp-autoprefixer')
const csscomb = require('gulp-csscomb')
const cleanCSS = require('gulp-clean-css')
const gulpIf = require('gulp-if')
const concat = require('gulp-concat')
const save = require('gulp-save')
const flatmap = require('gulp-flatmap')
const merge2 = require('merge2')
const multipipe = require('multipipe')
const browserSync = require('browser-sync').create()
const svgSprite = require('gulp-svg-sprites')
const del = require('del')
let mode = 'development'
let saveComponents


function components() {
  return saveComponents = gulp.src([
    'src/pages/helpers/variables.pug',
    'src/pages/helpers/mixins.pug',
    'src/pages/components/**/*.pug'
  ])
    .pipe(save('components'))
}

function pages() {
  return gulp.src('src/pages/*.pug')
    .pipe(flatmap(function(stream, file) {
      return merge2(saveComponents.pipe(save.restore('components')), stream)
        .pipe(concat({ path: file.path, base: file.base }))
    }))
    .pipe(pug({ pretty: true, plugins: [pugbem] }))
    .pipe(gulpIf(mode === 'production', prettyHtml({
      indent_size: 2,
      inline: ['b','big','br','em','i','small','span','strong','sub','sup'],
      extra_liners: ['header','main','footer', 'script', '/body']
    })))
    .pipe(gulp.dest('dist'))
}

function styles() {
  return gulp.src([
    'node_modules/normalize.css/normalize.css',
    'node_modules/animate.css/animate.css',
    'src/styles/helpers/variables.scss',
    'src/styles/helpers/mixins.scss',
    'src/styles/helpers/fonts.scss',
    'src/styles/helpers/base.scss',
    'src/styles/components/**/*.scss'
  ])
    .pipe(gulpIf('*.scss', multipipe(
      concat('main.scss'),
      sass(),
      gulpIf(mode === 'production', multipipe(
        autoprefixer({ browsers: ['last 15 versions'] }),
        csscomb()
      ))
    )))
    .pipe(concat('main.css'))
    .pipe(gulpIf(mode === 'production', cleanCSS()))
    .pipe(gulp.dest('dist/css'))
}

function scripts() {
  return gulp.src('src/scripts/main.js')
    .pipe(webpack({
      mode,
      output: { filename: 'main.js' },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: { presets: ['@babel/preset-env'] }
            }
          }
        ]
      }
    }))
    .pipe(gulp.dest('dist/js'))
}

function symbols(done) {
  return gulp.src('src/symbols/**/*.svg')
    .pipe(svgSprite({
      mode: 'symbols',
      preview: false,
      svg: { symbols: 'symbols.svg' }
    }))
    .pipe(gulp.dest('dist/svg'))
}

function serve(done) {
  browserSync.init({
    server: { baseDir: "./dist" },
    notify: false,
    open: false
  })
  done()
}

function reload(done) {
  browserSync.reload()
  done()
}

function clean() {
  return del('dist')
}

function copy() {
  return gulp.src('src/assets/**/*.*')
    .pipe(gulp.dest('dist'))
}

function public(done) {
  mode = 'production'
  done()
}

function watch() {
  gulp.watch('{src/pages/helpers,src/pages/components}/**/*.pug', gulp.series(components, pages, reload))
  gulp.watch('src/pages/*.pug', gulp.series(pages, reload))
  gulp.watch('src/styles/**/*.scss', gulp.series(styles, reload))
  gulp.watch('src/scripts/**/*.js', gulp.series(scripts, reload))
  gulp.watch('src/symbols/**/*.svg', gulp.series(symbols, reload))
  gulp.watch('src/assets/**/*', gulp.series(copy, reload))
}

const dev = gulp.series(clean, copy, components, pages, styles, scripts, symbols, serve, watch)
const build = gulp.series(public, dev)

gulp.task('default', dev)
gulp.task('build', build)