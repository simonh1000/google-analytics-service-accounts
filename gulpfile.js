var	gulp    = require('gulp'),
	babel   = require('gulp-babel'),
	rename  = require("gulp-rename"),
	gulpif  = require('gulp-if'),
	stripDebug = require('gulp-strip-debug');

var production = true;
// Remove console.log statements in production code

gulp.task('es6', function() {
	return gulp.src('index.es6.js')
	.pipe(rename('index.js'))
	.pipe(gulpif(production, stripDebug()))
	.pipe(babel())
	.pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch('index.es6.js', ['es6']);
});

gulp.task('default', ['es6', 'watch']);
