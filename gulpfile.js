var	gulp    = require('gulp'),
	babel   = require('gulp-babel'),
	rename = require("gulp-rename");


gulp.task('es6', function() {
	return gulp.src('index.es6.js')
	.pipe(rename('index.js'))
	// .pipe(sourcemaps.init())    // needs to be first
	.pipe(babel())
	// .pipe(sourcemaps.write())   // don't need to write them for them be usable
	.pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch('*.es6.js', ['es6']);
});

gulp.task('default', ['es6', 'watch']);
