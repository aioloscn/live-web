new Vue({
	el: '#app',
	data: {
		userId: 1999,
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
			let data = new FormData();
			data.append("id",1);
			httpPost('http://localhost:8080/live/api/test/testPost',data).then(resp=>{
				console.log(resp);
			})
			httpPost('http://localhost:8080/live/api/test/testPost2',data).then(resp=>{
				console.log(resp);
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
			this.hasSendSms = true;
			//发送验证码按钮文字调整
			console.log('send sms');
			var that = this;
			var interval = setInterval(function () {
				console.log('send sms test');
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
		},

		checkPhone: function(){
			let phoneReg = /(^1[3|4|5|7|8]\d{9}$)|(^09\d{8}$)/;
			if (this.mobile == '' || !phoneReg.test(this.mobile)) {
				this.$message.error('手机号格式有误');
				return false;
			}
			return true;
		},

	}

})