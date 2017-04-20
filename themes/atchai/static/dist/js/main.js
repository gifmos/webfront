$(document).ready(function(){
	var $captions = $('p img').map(function(el){ 
		return $(this).parents('p').next().get(0);
	}).filter(function(){
		return $(this).is('blockquote');
	});	
	$captions.addClass('is-caption');
});
