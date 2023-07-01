new Vue({
	el: '#app',
	data: {
		userId: 0,
		showLoginPop: false,
		loginCodeBtn: '验证码',
		lastTime: 60,
		mobile: '',
		code: '',
		hasSendSms: false,
		livingRoomList: {},
		isLogin: false,
		initInfo: "登录",
		listType: 0,
		startLivingRoomTab: false
	},

	//页面初始化的时候会调用下这里面的方法
	mounted() {
		this.initPage();
	},

	methods: {
		initPage:function() {
			httpPost(homePageUrl,{}).then(resp=>{
				console.log('请求成功');
			})
		},
		showLoginPopNow: function () {
			this.showLoginPop = true;
		},
		hiddenLoginPopNow: function () {
			this.showLoginPop = false;
		},

		mobileLogin: function () {
			if (this.code == '') {
				this.$message.error('请输入验证码');
				return;
			}
			var checkStatus = this.checkPhone();
			if(!checkStatus) {
				return;
			}
			var that = this;
			let data = new FormData();
			data.append("phone",this.mobile);
			data.append("code",this.code);
			//请求登录接口
			httpPost(loginUrl,data).then(resp=>{
				//登录成功
				if(resp.code==200) {
					that.userId=resp.data.userId;
					that.$message.success('登录成功');
					that.hiddenLoginPopNow();
					that.isLogin=true;
					that.userId=resp.data.userId;
				} else {
					that.$message.error(resp.msg);
				}
			})
		},


		sendSmsCode: function () {
			if (this.hasSendSms) {
				return;
			}
			console.log(this.mobile);
			var checkStatus = this.checkPhone();
			if(!checkStatus) {
				return;
			}
			//发送验证码按钮文字调整
			var that = this;
			let data = new FormData();
			data.append("phone",this.mobile);
			//请求短信发送接口
			httpPost(sendSmsUrl,data).then(resp=>{
				if(resp.code==200)	{
					that.hasSendSms = true;
					//短信发送成功会有一个弹窗
					that.$message.success('短信发送成功');
					var interval = setInterval(function () {
						that.loginCodeBtn = '发送中(' + that.lastTime + ')';
						if (that.lastTime == 0) {
							that.lastTime = 60;
							that.loginCodeBtn = '验证码';
							that.hasSendSms = false;
							console.log('清理定时器');
							clearInterval(interval);
							return;
						} else {
							that.lastTime = that.lastTime - 1;
						}
					}, 1000);
				} else {
					that.$message.error(resp.msg);
				}
			})
		},

		checkPhone: function(){
			let phoneReg = /(^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$)/;
			if (this.mobile == '' || !phoneReg.test(this.mobile)) {
				this.$message.error('手机号格式有误');
				return false;
			}
			return true;
		},

	}

})