/**
 * spec at : https://docs.google.com/document/d/1Qw4u6ftavHCkzi5dxusGqDxuUzKxQRSgYhBVdTvT2Os
 */

var anclient = {
		sessionid: null,
		serverreply: null,
		lang: 'hu',
		taxonomy: {},
		user: {
			uid: null,
			uname: 'testuser',
			udata: {},
			/**
			 * Check if the user is logged in.
			 * @returns {Boolean}
			 */
			is_logged_in: function() {
				if (anclient.user.uid===null) return false;
				return true;
			},
			/**
			 * Return a unique local id for transactions etc, or null if the user is not logged in.
			 * @returns {Number}
			 */
			get_local_unique_id: function() {
				if (anclient.user.is_logged_in()===false) return null;
				var slid = localStorage.getItem('an-localid-'+anclient.user.uid);
				if (slid===null) {
					slid = 1;
				} else {
					++slid;
				}
				localStorage.getItem('an-localid-'+anclient.user.uid,slid);
				return slid;
			}
		},
		event: {
			listeners: {},
			on: function(evtype,cb) {
				if (typeof anclient.event.listeners[evtype]=='undefined') {
					anclient.event.listeners[evtype] = [];
				}
				anclient.event.listeners[evtype].push(cb);
			},
			off: function(evtype,cb) {
				if (typeof cb=='undefined') {
					anclient.event.listeners[evtype] = [];
				} else {
					if ((typeof anclient.event.listeners[evtype]!='undefined')&&(anclient.event.listeners[evtype].length>0)) {
						var nt = [];
						for(var i=0;i<anclient.event.listeners[evtype].length;i++) {
							if (anclient.event.listeners[evtype][i]!==cb) {
								nt.push(anclient.event.listeners[evtype][i]);
							}
						}
						anclient.event.listeners[evtype] = nt;
					}
				}
			},
			fire: function(evtype,evdata) {
				if (typeof evdata=='undefined') {
					evdata = null;
				}
				var evv = {'type':evtype,'data':evdata};
				console.log('event.fire: ',evv);
				if ((typeof anclient.event.listeners[evtype]!='undefined')&&(anclient.event.listeners[evtype].length>0)) {
					var r;
					var work = true;
					for(var i=0;i<anclient.event.listeners[evtype].length;i++) {
						if (work===true) {
							r = anclient.event.listeners[evtype][i].call(anclient,evv);
							if (r===false) work = false;
						}
					}
				}
			}
		},
		tool: {
			/**
			 * Converts an ArrayBuffer to a base64-encoded String.
			 * @param {ArrayBuffer} buffer
			 * @returns {String}
			 */
			abuf2b64: function( buffer ) {
			    var binary = '';
			    var bytes = new Uint8Array( buffer );
			    var len = bytes.byteLength;
			    for (var i = 0; i < len; i++) {
			        binary += String.fromCharCode( bytes[ i ] );
			    }
			    return window.btoa( binary );
			}
		},
		form: {
			/**
			 * Get data as an object with item name-value pairs from a form.
			 * Due to file handling capability and FileReader's M.O., it returns a promise, 
			 * whose resolve callback gets the form data object as its sole parameter.
			 * Skips all form items that have CSS class 'form-skip'. 
			 * @param {String} formslc CSS selector for the form
			 * @return {Promise}
			 */
			form_data_to_object: function(formslc) {
				return new Promise(function(resolve,reject) {
					var inobj = $(formslc);
					var form;
					if (inobj.prop('tagName')=='FORM') {
						form = inobj;
					} else {
						form = inobj.parents('form');
					}
					var fd = form.serializeArray();
					var fins = {}, rn = '';
					for(var i=0;i<fd.length;i++) {
						var fie = form.find('[name="'+fd[i].name+'"]').first();
						if (fie.hasClass('form-skip')===false) {
							if (fd[i].name.indexOf('[')>0) {
								rn = fd[i].name.substr(0,fd[i].name.length-2);
								if (typeof fins[rn]=='undefined') {
									fins[rn] = [];
								}
								fins[rn].push(fd[i].value);
							} else {
								fins[fd[i].name] = fd[i].value;
							}
						}
					}
					var filez = [];
					form.find('input[type="file"]').each(function() {
						var fl = this.files;
						var fcn = $(this).attr('name');
						fins[fcn] = [];
						var fid;
						for(i=0;i<fl.length;i++) {
							fid = {'name':fl[i].name,'size':fl[i].size,'status':'reading','fob':fl[i]};
							filez.push(fid);
							fins[fcn].push(fid);
						}
					});
					if (filez.length==0) {
						resolve(fins);
					} else {
						for(i=0;i<filez.length;i++) {
							var fre = new FileReader();
							fre.onload = (function(ind) {
								return function(evt) {
									filez[ind]['status'] = undefined;
									filez[ind]['fob'] = undefined;
									delete(filez[ind]['status']);
									delete(filez[ind]['fob']);
									filez[ind]['contents'] = anclient.tool.abuf2b64(evt.target.result);
									if (ind==(filez.length-1)) {
										resolve(fins);
									}
								};
							})(i);
							fre.readAsArrayBuffer(filez[i].fob);
						}
					}
				});
			},
			/**
			 * Fill a HTML form with data
			 * @param {String} formslc CSS selector for the form
			 * @param {Object} fdata plain object containing form item name-value pairs
			 */
			form_object_to_data: function(formslc,fdata) {
				var e,et,ha;
				$(formslc+' [type="checkbox"]').prop('checked',false);
				for(var n in fdata) {
					ha = false;
					e = $(formslc+' [name="'+n+'"]');
					if (e.length>0) {
						if (e.length>1) {
							if (e.first().attr('type')==='radio') {
								$(formslc+' [name="'+n+'"]').filter('[value="'+fdata[n].toString()+'"]').prop('checked',true);
								ha = true;
							}
							else if (e.first().attr('type')==='checkbox') {
								if (Object.prototype.toString.call(fdata[n])!=='[object Array]') {
									fdata[n] = [fdata[n]];
								}
								for(var i=0;i<fdata[n].length;i++) {
									$(formslc+' [name="'+n+'"]').filter('[value="'+fdata[n][i].toString()+'"]').prop('checked',true);
								}
							}
						} else {
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
								if (e.prop('tagName')=='SELECT') {
									if (e.prop('multiple')===true) {
										if (Object.prototype.toString.call(fdata[n])!=='[object Array]') {
											fdata[n] = [fdata[n]];
										}
										e.find('option').each(function() {
											if ($.inArray($(this).attr('value'),fdata[n])) {
												$(this).prop('selected',true);
											} else {
												$(this).prop('selected',false);
											}
										});
									} else {
										if (Object.prototype.toString.call(fdata[n])==='[object Array]') {
											fdata[n] = fdata[n][0];
										}
										e.val(fdata[n]);
									}
								} else {
									e.val(fdata[n]);
								}
							}
						}
					} else {
						console.log('form.err: no matching field for '+n+' under selector '+formslc);
					}
				}
			}
		},
		comm: {
			urlprefix: 'http://assist-network.herokuapp.com/',
			ajax_post: function(url,params) {
				if (typeof params=='undefined') {
					params = {};
				}
				return anclient.comm.ajax(url,params,'POST');
			},
			ajax_get: function(url,params) {
				if (typeof params=='undefined') {
					params = {};
				}
				return anclient.comm.ajax(url,params,'GET');
			},
			ajax: function(url,params,meth) {
				if (url=='') {
					url = anclient.comm.urlprefix+'api/com';
				}
				else if (url.substr(0,1)=='/') {
					url = anclient.comm.urlprefix+url.substr(1);
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
							anclient.event.fire('comm.error', {type:'ajax',error:err,errtx:tst,xhr:xhr,url:url,params:params});
							rej(tst,err);
						},
						method:meth,
						success:function(dt) {
							$('.loading').hide();
							anclient.event.fire('comm.success', {type:'ajax',url:url,params:params,result:dt});
							res(dt);
						}
					});
				});
			}
		},
		geo: {
			current: '47.539063,19.049691',
			get_pos: function() {
				return new Promise(function(res,rej) {
					if (localStorage.getItem('an-lastlatlon')===null) {
						anclient.geo.current = '47.539063,19.049691';
					} else {
						anclient.geo.current = localStorage.getItem('an-lastlatlon');
					}
					navigator.geolocation.getCurrentPosition(function(psn) {
						anclient.geo.current = psn.coords.latitude.toString()+psn.coords.longitude.toString();
						localStorage.setItem('an-lastlatlon',anclient.geo.current);
						anclient.event.fire('geo.position', anclient.geo.current);
						res(anclient.geo.current);
					},function() {
						console.log('geo.err: no geolocation available, using last known pos');
						anclient.event.fire('geo.error');
						rej();
					});
				});
			}
		},
		init: function() {
			if (localStorage.getItem('an-taxonomy')===null) {
				anclient.comm.ajax_get('http://www.pdx.hu/jobs/an/js/taxonomy.json').then(function(d) {
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
			//if we need to wait for geopos for login, this tool can be used as a promise
			anclient.geo.get_pos();
			anclient.comm.ajax_get('/api/').then(function(d) {
				anclient.serverreply = d;
			},function(stat,err) {
				console.log('ext.err: '+stat+' '+err);
			});
		}
};

$(document).ready(anclient.init);
