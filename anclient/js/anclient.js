/**
 * 
 */

var anclient = {
		sessionid: null,
		urlprefix: 'http://assist-network.herokuapp.com/',
		taxonomy: {},
		ajaxap: function(url,params) {
			if (url=='') url = anclient.urlprefix+'api/com';
			params['sessionid'] = anclient.sessionid;
			return new Promise(function(res,rej) {
				$.ajax(url,{
					beforeSend:function() {
						$('.loading').show();
						return true;
					},
					complete:function() {
						$('.loading').hide();
					},
					cache: false,
					data:params,
					dataType:'json',
					error:function(xhr,tst,err) {
						rej(tst,err);
					},
					method:'POST',
					success:function(dt) {
						res(dt);
					}
				});
			});
		},
		init: function() {
			anclient.ajaxap('js/taxonomy.json').then(function(d) {
				anclient.taxonomy = d;
				console.log('ext: loaded taxonomy db');
				anclient.initreal();
			},function(x,stat,err) {
				console.log('ext.err: '+stat+' '+err);
			});
		},
		initreal: function() {
			
		}
};

$(document).ready(anclient.init);
