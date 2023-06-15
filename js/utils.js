function addCookie(name, value, days, path) {
    /**添加设置cookie**/
    var name = escape(name);
    var value = escape(value);
    var expires = new Date();
    expires.setTime(expires.getTime() + days * 3600000 * 24);
    //path=/，表示cookie能在整个网站下使用，path=/temp，表示cookie只能在temp目录下使用
    path = path == "" ? "" : ";path=" + path;
    //GMT(Greenwich Mean Time)是格林尼治平时，现在的标准时间，协调世界时是UTC
    //参数days只能是数字型
    var _expires = (typeof days) == "string" ? "" : ";expires=" + expires.toUTCString();
    document.cookie = name + "=" + value + _expires + path;
}

function hasCookie(name) {
    return document.cookie.indexOf(name) > 0;
}

function deleteCookie(name, path) {
    /**根据cookie的键，删除cookie，其实就是设置其失效**/
    var name = escape(name);
    var expires = new Date(0);
    path = path == "" ? "" : ";path=" + path;
    document.cookie = name + "=" + ";expires=" + expires.toUTCString() + path;
}

function logout() {
    deleteCookie("ztscrip", "/");
    window.location.href = '../common/admin_login.html';
}







function getQueryStr(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURI(r[2]);
    return null;
}

function isSuccess(resp) {
    return resp != "error" && resp.code == 200;
}

