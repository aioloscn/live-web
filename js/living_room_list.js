new Vue({
	el: '#app',
	data: {
		userId: 0,
		livingRoomList: {},
		isLogin: false,
		initInfo: {},
		loginBtnMsg: '登录',
		showStartLivingBtn:false,
		listType: 1,
		page:1,
		pageSize:15,
		startLivingRoomTab: false,
		loadingNextPage: false,
		hasNextPage: true,
		currentChooseTab: null
	},

	//页面初始化的时候会调用下这里面的方法
	mounted() {
		this.initPage();
		this.listLivingRoom(1);
		this.initLoad();
		console.log('handler');
	},

	methods: {
		load:function() {
			console.log('this is load');
		},
		initPage:function() {
			var that = this;
			httpPost(homePageUrl,{}).then(resp=>{
				//登录成功
				if(resp.data.loginStatus) {
					that.initInfo=resp.data;
					that.loginBtnMsg='';
					that.isLogin =true;
				}
				console.log('登录状态', that.isLogin);
			})
		},

		chooseLivingType: function(type,id) {
			this.listLivingRoom(type);
			if(this.currentChooseTab!=null) {
				this.currentChooseTab.classList.remove('top-title-active');
			}
			this.currentChooseTab = document.getElementById(id);
			this.currentChooseTab.classList.add('top-title-active');
		},

		listLivingRoom: function(type) {
			var that = this;
			let data = {
				current: 1,
				size: that.pageSize,
				data: {
					type: type
				}
			}
			console.log('list page', data)
			httpPost(listLivingRoomUrl,data).then(resp=>{
				//登录成功
				if(isSuccess(resp)) {
					that.livingRoomList = resp.data.records;
				}
			})
		},
		showLoginPopNow: function () {
			this.goToLoginCenter();
		},
		buildLoginCenterUrl: function () {
			var currentUrl = window.location.href;
			var target = loginCenterUrl || "";
			if (!target) {
				return "";
			}
			var joiner = target.indexOf("?") >= 0 ? "&" : "?";
			return target + joiner + "redirect=" + encodeURIComponent(currentUrl);
		},
		goToLoginCenter: function () {
			var redirectUrl = this.buildLoginCenterUrl();
			if (!redirectUrl) {
				this.$message.error("登录中心地址未配置");
				return;
			}
			window.location.href = redirectUrl;
		},

		showStartLivingRoomTab: function() {
            this.startLivingRoomTab = true;
        },
		startLivingRoom: function () {
			this.toLivingRoom();
        },

		jumpToLivingRoomPage(livingType) {
			console.log('isLogin', this.isLogin);
			if(!this.isLogin) {
				this.$message.error('请先登录');
				return;
			}
			let data = new FormData();
			data.append("type",livingType);
			//请求开播接口
			httpPost(startLiving,data).then(resp=>{
				//开播成功
				if(isSuccess(resp)) {
					if(livingType == 1) {
						//去直播间详情页面
						window.location.href = "./living_room.html?roomId=" + resp.data.roomId;
					} else if (livingType==2) {
						window.location.href = "./living_room_pk.html?roomId=" + resp.data.roomId;
					}
				    
				} else {
					that.$message.error(resp.msg);
				}
			})

        },
		jumpToLivingRoom(roomId,type) {
			// if(!this.isLogin) {
			// 	this.$message.error('请先登录');
			// 	return;
			// }
			if(type==1) {
				window.location.href = "./living_room.html?roomId=" + roomId;
			} else if(type==2) {
				window.location.href = "./living_room_pk.html?roomId=" + roomId;
			}
		},

		initLoad: function() {
			   	let that = this;
				window.addEventListener('scroll', function() {
					let scrollTop=document.documentElement.scrollTop//滚动条在Y轴滚动过的高度
					let scrollHeight=document.documentElement.scrollHeight//滚动条的高度
					let clientHeight=document.documentElement.clientHeight//浏览器的可视高度
					//可能会有部分误差
					if(scrollTop+clientHeight>=scrollHeight-100 && that.loadingNextPage==false && that.hasNextPage == true){
					  that.loadingNextPage = true;
					  console.log('滚动到底部了');
					  //触发第二页的数据加载
					  that.page = that.page + 1;
					  let data = {
							current: that.page,
							size: that.pageSize,
							data: {
								type: that.listType
							}
						}
					  httpPost(listLivingRoomUrl,data).then(resp=>{
							//登录成功
							if(isSuccess(resp)) {
								let livingRoomTempList = resp.data.records;
								console.log('right push', livingRoomTempList)
								for (i = 0; i < livingRoomTempList.length; i++) {
									that.livingRoomList.push(livingRoomTempList[i]);
								}
								if(!resp.data.hasNext) {
									that.hasNextPage = false;
								} 
								that.loadingNextPage = false;

							}
						})
					}
				});
		}
	}

})
