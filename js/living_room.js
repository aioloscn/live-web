new Vue({
    el: '#app',
    data: {
        form: {
            review: ""
        },
        chatList: [],
        giftList: [],
        canvas: {},
        player: {},
        parser: {},
        websock: null,
        roomId: -1,
        anchorId: -1,
        userId: -1,
        isLogin: false,
        wsServer: '',
        imToken: 'qwenaskjn=-1238yu1298hdasjkbxckjwe',
        initInfo: {},
        imServerConfig: {},
        showGiftRank: false,
        rankList: [],
        accountInfo: {},
        showBankInfo: false,
        lastPayBtnId: -1,
        payProducts: [],
        qrCode: '',
        dlProgress: 10,
        closeLivingRoomDialog: false,
        livingRoomHasCloseDialog: false,
        timer: null
    },

    mounted() {
        this.connectImServer();
        // this.anchorConfigUrl();
    },

    beforeDestroy() {
        this.timer = null;
    },

    methods: {

        connectImServer: function() {
            let that = this;
            httpPost(getImConfigUrl, {})
            .then(resp => {
                if (isSuccess(resp)) {
                    that.imServerConfig = resp.data;
                    let url = "ws://"+that.imServerConfig.wsImServerAddress+"/token=" + that.imServerConfig.token+"&&userId=167394";
                    console.log(url);
                    that.websock = new WebSocket(url);
                    that.websock.onmessage = that.websocketOnMessage;
                    that.websock.onopen = that.websocketOnOpen;
                    that.websock.onerror = that.websocketOnError;
                    that.websock.onclose = that.websocketClose;
                    console.log('初始化ws服务器');
                }
            });
           
        },

        websocketOnOpen() {
            console.log('初始化连接建立');
            //  //发送一个登录的心跳包给到服务端
            //  var jsonStr = {"userId": 100111, "appId": 10001, "token": this.imToken};
            //  let bodyStr = JSON.stringify(jsonStr);
            //  if(bodyStr!=null) {
            //     let loginPkg = {'magic':19231,'code':1001,'len': bodyStr.length, 'body': bodyStr};
            //     this.websocketSend(JSON.stringify(loginPkg));
            //  }
        },

        websocketOnError() {
            console.error('出现异常');
        },

        websocketOnMessage(e) { //数据接收
            console.log(e);
        },

        websocketSend(data) {//数据发送
            console.log(data);
            this.websock.send(data);
        },

        websocketClose(e) {  //关闭
            console.log('断开连接', e);
        },

        //直播间初始化配置加载时候调用
        anchorConfigUrl: function () {
            let data = new FormData();
			data.append("roomId",getQueryStr("roomId"));
            var that = this;
            httpPost(anchorConfigUrl, data)
                .then(resp => {
                    if (isSuccess(resp)) {
                        if(resp.data.roomId>0) {
                            that.initInfo = resp.data;
                        } else {
                            this.$message.error('直播间已不存在');
                        }
                    }
                });
        },
        
        closeLivingRoom: function() {
            let data = new FormData();
			data.append("roomId",getQueryStr("roomId"));
            httpPost(closeLiving, data)
            .then(resp => {
                if (isSuccess(resp)) {
                    window.location.href='./living_room_list.html';
                }
            });
        },

        sendReview: function () {
            if (this.form.review == '') {
                this.$message({
                    message: "评论不能为空",
                    type: 'warning'
                });
                return;
            }
            let sendMsg = {"content": this.form.review, "senderName": this.initInfo.nickname, "senderImg": this.initInfo.avatar};
            let msgWrapper = {"msgType": 1, "msg": sendMsg};
            this.chatList.push(msgWrapper);
            this.form.review = '';
            this.$nextTick(() => {
                var div = document.getElementById('talk-content-box')
                div.scrollTop = div.scrollHeight
            })
        },

     
    }

});