export enum ErrCode {
    /**
     * 用户不存在
     */
    UserNotExist = -2010,

    /**
     * 会话超时
     */
    SessionTimeout = -2012,

    /**
     * 鉴权失败
     */
    AuthenticationFailed = -2013,

    /**
     * 微信授权已过期，需重新登录
     */
    AuthenticationTimeout = -12013,

    /**
     * 无权限下载
     */
    NoPermissionDownload = -2038,
}
