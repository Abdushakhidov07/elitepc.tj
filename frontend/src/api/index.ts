export { default as apiClient } from './client';
export { getAccessToken, getRefreshToken, setTokens, clearTokens } from './client';

import * as productsApi from './products';
import * as authApi from './auth';
import * as cartApi from './cart';
import * as ordersApi from './orders';
import * as configuratorApi from './configurator';
import * as adminApi from './admin';

export { productsApi, authApi, cartApi, ordersApi, configuratorApi, adminApi };

export type { ProductsParams } from './products';
export type { RegisterData, LoginData, ProfileUpdateData } from './auth';
export type { AddToCartData, UpdateCartItemData } from './cart';
export type { CreateOrderData } from './orders';
export type { CreateConfigurationData, AddComponentData, AddConfigToCartData } from './configurator';
