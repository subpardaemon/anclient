/**
 * 
 */

var anclient = {
		sessionid: null,
		serverreply: null,
		lang: 'hu',
		urlprefix: 'http://assist-network.herokuapp.com/',
		taxonomy: {},
		currpos: '47.539063,19.049691',
		ajaxpostap: function(url,params) {
			if (typeof params=='undefined') {
				params = {};
			}
			return anclient.ajaxap(url,params,'POST');
		},
		ajaxgetap: function(url,params) {
			if (typeof params=='undefined') {
				params = {};
			}
			return anclient.ajaxap(url,params,'GET');
		},
		ajaxap: function(url,params,meth) {
			if (url=='') {
				url = anclient.urlprefix+'api/com';
			}
			else if (url.substr(0,1)=='/') {
				url = anclient.urlprefix+url.substr(1);
			}
			if (typeof params=='undefined') {
				params = {};
			}
			if (typeof meth=='undefined') {
				meth = 'GET';
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
					method:meth,
					success:function(dt) {
						$('.loading').hide();
						res(dt);
					}
				});
			});
		},
		posn: function() {
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
			if (localStorage.getItem('an-lastlatlon')===null) {
				anclient.currpos = '47.539063,19.049691';
			} else {
				anclient.currpos = localStorage.getItem('an-lastlatlon');
			}
			navigator.geolocation.getCurrentPosition(function(psn) {
				anclient.currpos = psn.coords.latitude.toString()+psn.coords.longitude.toString();
				localStorage.setItem('an-lastlatlon',anclient.currpos);
			},function() {
				console.log('geo.err: no geolocation available, using last known pos');
			});
			anclient.ajaxgetap('/api/').then(function(d) {
				anclient.serverreply = d;
			},function(stat,err) {
				console.log('ext.err: '+stat+' '+err);
			});
		},
		vals2form: function(formslc,fdata) {
			var e,et,ha;
			$(formslc+' [type="checkbox"]').prop('checked',false);
			for(var n in fdata) {
				ha = false;
				e = $(formslc+' [name="'+n+'"]');
				if (e.length>0) {
					e = e.first();
					et = e.attr('type');
					if (et!==undefined) {
						et = et.toLowerCase();
						if (et=='radio') {
							$(formslc+' [name="'+n+'"]').filter('[value="'+fdata[n].toString()+'"]').prop('checked',true);
							ha = true;
						}
						else if (et=='checkbox') {
							if (e.attr('value')==fdata[n]) {
								e.prop('checked',true);
								ha = true;
							}
						}
					}
					if (ha===false) {
						
					}
				} else {
					console.log('form.err: no matching field for '+n+' under selector '+formslc);
				}
			}
			
		}
};

$(document).ready(anclient.init);
