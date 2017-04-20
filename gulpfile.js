var fs = require('fs');
var del  = require('del');
var gulp = require('gulp');
var load = require('gulp-load-plugins');
var exec = require('child-process-promise').exec;

// Loads currently install gulp-* plugins under $ namespace
var $ = load();

// Vars
//var IS_PROD  = process.env.NODE_ENV === 'production' ? true : false;
var IS_PROD  = true ;

var sass_src = 'themes/atchai/static/src/sass/';
var sass_out = 'themes/atchai/static/dist/css/';
var sass_options = {
	file: 'index.min.css',
	outputStyle: IS_PROD ? 'compressed': 'expanded',
	sourceMap: !IS_PROD,
	sourceMapEmbed: !IS_PROD
};

console.log('Production Build: ' + IS_PROD);

// Tasks
gulp.task('default', ['unpack-svg','sass:watch']);

gulp.task('sass:clean', function(cb){
	return del([
		sass_out + sass_options.file
	], cb);
});

gulp.task('sass:watch', function(){
	gulp.watch(sass_src + '**/*.sass' , ['sass']);
});

gulp.task('sass', ['sass:clean'], function(){
	return gulp.src(sass_src + 'index.sass')
		.pipe($.sass.sync(sass_options).on('error', $.sass.logError))
		.pipe($.rename(sass_options.file))
		.pipe(gulp.dest(sass_out));
});


function run(cmd){
	return (
		(cmd === false || (typeof cmd !== 'string'))
			? Promise.reject('Cannot not run command: ' + cmd)
			: exec(cmd)
	)
};

gulp.task('unpack-svg', function(cb){
	if (process.platform === 'win32'){
		console.log('unpack is not supported on windows. yet');
		return cb();
	}

	var cmd_to_unzip = 'unzip -o themes/atchai/static/misc/svg-icons.zip -d themes/atchai/static/misc/svg-icons';
	var cmd_to_clean = 'rm -rf themes/atchai/static/misc/svg-icons';
	var cmd_to_move  = [
		'cat themes/atchai/static/misc/svg-icons/style.css > themes/atchai/static/dist/css/svg-icons.css',
		'cat themes/atchai/static/misc/svg-icons/symbol-defs.svg > themes/atchai/static/img/svg-icons.svg',
		'cp themes/atchai/static/misc/svg-icons/svgxuse.min.js themes/atchai/static/dist/js/'
	];

	run(cmd_to_unzip)
		.then(()=> Promise.all(cmd_to_move.map(run)))
		.then(()=> run(cmd_to_clean))
		.then(()=> cb())
		.catch(console.error.bind(console));
});

gulp.task('verify', ['sass', 'unpack-svg'], function(cb){
	var list = [
		'themes/atchai/static/dist/css/index.min.css',
		'themes/atchai/static/dist/css/svg-icons.css',
		'themes/atchai/static/dist/js/svgxuse.min.js',
		'themes/atchai/static/img/svg-icons.svg'
	].map(function(x){
		return [fs.existsSync(x) ? 'exists' : 'not found', x]
	}).join('\n');
	console.log(list);
	cb();
});

gulp.task('build', ['sass', 'unpack-svg', 'verify']);