import myRequest from '../index';

interface OAuthStatusResponse {
  code: number;
  data: {
    google: boolean;
    github: boolean;
    googleClientId?: string | null;
  };
}

interface AuthUrlResponse {
  code: number;
  data: {
    authUrl: string;
  };
}

interface GoogleIdTokenLoginResponse {
  code: number;
  msg?: string;
  data: {
    id: number;
    name: string;
    token: string;
  };
}

/**
 * 检查 OAuth 配置状态
 * 用于前端判断是否显示 OAuth 登录按钮 / One Tap
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
 * Google One Tap / GIS：用 credential (id_token) 换取站点 JWT
 */
export const loginWithGoogleIdToken = (credential: string) => {
  return myRequest.post<GoogleIdTokenLoginResponse>({
    url: '/oauth/google/idtoken',
    data: { credential },
    showLoading: false,
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
