let server_addr="https://live.aiolos.com";
let authServerAddr = "https://auth.aiolos.com";
window.oauth2Config = {
    clientId: "live-web-client",
    baseUrl: authServerAddr,
    authorizeEndpoint: authServerAddr + "/oauth2/authorize",
    tokenEndpoint: authServerAddr + "/oauth2/token",
    userInfoEndpoint: authServerAddr + "/userinfo",
    redirectUri: server_addr + "/html/living_room_list.html",
    scope: "openid profile"
};

let gatewayPrefix = "/api";
let apiGatewayBase = server_addr + gatewayPrefix;
let apiUrl = "/live-api";
let imUrl = "/live-im-provider"
let livingUrl = "/live-living-provider"
let userUrl = "/badger-user-provider"

let homePageUrl = apiGatewayBase + livingUrl + "/home/init-page";
let startLiving = apiGatewayBase + livingUrl + "/living-room/start-streaming";
let closeLiving = apiGatewayBase + livingUrl + "/living-room/stop-streaming";
let anchorConfigUrl = apiGatewayBase + livingUrl + "/living-room/anchor-config";
let listLivingRoomUrl = apiGatewayBase + livingUrl +"/living-room/list";
let getImConfigUrl = apiGatewayBase + imUrl + "/im/get-im-config";
let listGiftConfigUrl = apiGatewayBase + apiUrl + "/gift/listGift";
let sendGiftUrl = apiGatewayBase + apiUrl + "/gift/send";
let payProductsUrl = apiGatewayBase + apiUrl + "/bank/products";
let payProductUrl = apiGatewayBase + apiUrl + "/bank/payProduct";
let onlinePkUrl = apiGatewayBase + apiUrl + "/living/onlinePk";
let prepareRedPacketUrl = apiGatewayBase + apiUrl + "/living/prepareRedPacket";
let startRedPacketUrl = apiGatewayBase + apiUrl + "/living/startRedPacket";
let getRedPacketUrl = apiGatewayBase + apiUrl + "/living/getRedPacket";
let queryShopInfoUrl = apiGatewayBase + apiUrl + "/shop/listSkuInfo";
let queryShopDetailInfoUrl = apiGatewayBase + apiUrl + "/shop/detail";
let addShopCarUrl = apiGatewayBase + apiUrl + "/shop/addCar";
let getCarInfoUrl = apiGatewayBase + apiUrl + "/shop/getCarInfo";
let removeFromCarUrl = apiGatewayBase + apiUrl + "/shop/removeFromCar"
let createPrepareOrderInfoUrl = apiGatewayBase + apiUrl + "/shop/prepareOrder";
let payNowUrl = apiGatewayBase + apiUrl +"/shop/payNow";
