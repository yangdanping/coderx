import myRequest from '../index';

interface OAuthStatusResponse {
  code: number;
  data: {
    google: boolean;
    github: boolean;
  };
}

interface AuthUrlResponse {
  code: number;
  data: {
    authUrl: string;
  };
}

/**
 * 检查 OAuth 配置状态
 * 用于前端判断是否显示 OAuth 登录按钮
 */
export const getOAuthStatus = () => {
  return myRequest.get<OAuthStatusResponse>({
    url: '/oauth/status',
    showLoading: false,
  });
};

/**
 * 获取 Google 授权 URL
 */
export const getGoogleAuthUrl = () => {
  return myRequest.get<AuthUrlResponse>({
    url: '/oauth/google',
  });
};

/**
 * 获取 GitHub 授权 URL
 */
export const getGitHubAuthUrl = () => {
  return myRequest.get<AuthUrlResponse>({
    url: '/oauth/github',
  });
};
