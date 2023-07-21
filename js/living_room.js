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
        imToken: '',
        initInfo: {},
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
        this.initUserInfo();
    },

    beforeDestroy() {
        this.timer = null;
    },

    methods: {

        initUserInfo: function () {
            httpPost(initInfoUrl, {})
                .then(resp => {
                    if (isSuccess(resp)) {
                        this.initInfo = resp.data;
                        console.log(this.initInfo);
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
            let msgBodyStr = {"senderId": this.userId, "livingRoomId": this.roomId, "source": 1, "content": this.form.review};
            let msgBody = {"code": 1, "body": JSON.stringify(msgBodyStr)};
            let sendMsgPkg = {"bizCode": 0, "type": 1, "token": this.imToken, "userId": this.userId, "content": msgBody};
            let sendMsgStr = JSON.stringify(sendMsgPkg);
            let sendMsgPkgInfo = {'contentLength': sendMsgStr.length, 'body': sendMsgStr};

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