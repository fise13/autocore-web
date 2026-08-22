/**
 * Home is a Dynamic Business Summary, not a Mission Control card stack.
 *
 * The screen itself lives in `./home`; this file is the stable entry point the
 * tab route and the feature barrel already import, kept so the swap did not
 * ripple through navigation.
 */
export { HomeScreen as OverviewScreen } from './home';
