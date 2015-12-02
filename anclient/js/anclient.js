/**
 * 
 */

var anclient = {
		sessionid: null,
		serverreply: null,
		lang: 'hu',
		urlprefix: 'http://assist-network.herokuapp.com/',
		taxonomy: {},
		ajaxap: function(url,params) {
			if (url=='') {
				url = anclient.urlprefix+'api/com';
			}
			else if (url.substr(0,1)=='/') {
				url = anclient.urlprefix+url.substr(1);
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
					method:'GET',
					success:function(dt) {
						$('.loading').hide();
						res(dt);
					}
				});
			});
		},
		init: function() {
			if (localStorage.getItem('an-taxonomy')===null) {
				anclient.ajaxap('http://www.pdx.hu/jobs/an/js/taxonomy.json').then(function(d) {
					anclient.taxonomy = d;
					localStorage.setItem('an-taxonomy',JSON.stringify(d));
					console.log('ext: loaded taxonomy db');
					anclient.initreal();
				},function(stat,err) {
					console.log('ext.err: '+stat+' '+err);
				});
			} else {
				anclient.taxonomy = JSON.parse(localStorage.getItem('an-taxonomy'));
				anclient.initreal();
			}
		},
		initreal: function() {
			$(".dropdown-toggle").dropdown();
			anclient.ajaxap('/api/').then(function(d) {
				anclient.serverreply = d;
			},function(stat,err) {
				console.log('ext.err: '+stat+' '+err);
			});
		}
};

$(document).ready(anclient.init);
