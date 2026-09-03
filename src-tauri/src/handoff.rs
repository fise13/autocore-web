//! Apple Handoff: advertise the current product URL as a browsing-web activity.
//!
//! Receive is handled by Tauri's `RunEvent::Opened` (tao continues
//! `NSUserActivityTypeBrowsingWeb` only) and then `deep_link`. Publish is
//! driven from the React app on client-side navigations that WKWebView does
//! not surface as native `on_navigation` events.

use tauri::AppHandle;
use url::Url;

pub fn set_current_url(app: &AppHandle, url: Option<Url>) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.run_on_main_thread(move || {
            macos::set_current_url(url.as_ref());
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, url);
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::cell::RefCell;

    use objc2::rc::Retained;
    use objc2::AnyThread;
    use objc2_foundation::{NSString, NSURL, NSUserActivity, NSUserActivityTypeBrowsingWeb};
    use url::Url;

    use crate::security;

    thread_local! {
        static ACTIVITY: RefCell<Option<Retained<NSUserActivity>>> = const { RefCell::new(None) };
        static LAST: RefCell<Option<String>> = const { RefCell::new(None) };
    }

    fn clear_activity() {
        ACTIVITY.with(|slot| {
            if let Some(activity) = slot.borrow_mut().take() {
                activity.resignCurrent();
                activity.invalidate();
            }
        });
        LAST.with(|last| last.replace(None));
    }

    pub fn set_current_url(url: Option<&Url>) {
        let eligible = url.and_then(|candidate| {
            if security::is_handoff_eligible(candidate) {
                security::inbound_link_to_product_url(candidate).ok()
            } else {
                None
            }
        });

        let Some(target) = eligible else {
            clear_activity();
            return;
        };

        let serialized = target.as_str().to_string();
        let unchanged = LAST.with(|last| last.borrow().as_deref() == Some(serialized.as_str()));
        if unchanged {
            return;
        }

        let Some(nsurl) = NSURL::URLWithString(&NSString::from_str(&serialized)) else {
            log::debug!("Handoff skipped; could not build NSURL for {serialized}");
            return;
        };

        ACTIVITY.with(|slot| {
            let mut slot = slot.borrow_mut();
            if slot.is_none() {
                let activity_type = unsafe { NSUserActivityTypeBrowsingWeb };
                let activity =
                    NSUserActivity::initWithActivityType(NSUserActivity::alloc(), activity_type);
                activity.setEligibleForHandoff(true);
                activity.setEligibleForSearch(false);
                activity.setTitle(Some(&NSString::from_str("AutoCore")));
                *slot = Some(activity);
            }

            if let Some(activity) = slot.as_ref() {
                activity.setWebpageURL(Some(&nsurl));
                activity.setNeedsSave(true);
                activity.becomeCurrent();
            }
        });

        LAST.with(|last| last.replace(Some(serialized)));
    }
}
