/**
 * 
 */

var anclient = {
		sessionid: null,
		serverreply: null,
		urlprefix: 'http://assist-network.herokuapp.com/',
		taxonomy: {},
		ajaxap: function(url,params) {
			if (url=='') {
				url = anclient.urlprefix+'api/com';
			}
			if (typeof params=='undefined') {
				params = {};
			}
			params['sessionid'] = anclient.sessionid;
			return new Promise(function(res,rej) {
				$.ajax(url,{
					beforeSend:function() {
						$('.loading').show();
						return true;
					},
					cache: false,
					data:params,
					dataType:'json',
					error:function(xhr,tst,err) {
						$('.loading').hide();
						rej(tst,err);
					},
					method:'POST',
					success:function(dt) {
						$('.loading').hide();
						res(dt);
					}
				});
			});
		},
		init: function() {
			anclient.ajaxap('http://www.pdx.hu/jobs/an/js/taxonomy.json').then(function(d) {
				anclient.taxonomy = d;
				console.log('ext: loaded taxonomy db');
				anclient.initreal();
			},function(stat,err) {
				console.log('ext.err: '+stat+' '+err);
			});
		},
		initreal: function() {
			$(".dropdown-toggle").dropdown();
			/*
			anclient.ajaxap(anclient.urlprefix+'api/').then(function(d) {
				anclient.serverreply = d;
			},function(stat,err) {
				console.log('ext.err: '+stat+' '+err);
			});
			*/
		}
};

$(document).ready(anclient.init);
