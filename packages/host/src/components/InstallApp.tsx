import { isIos, promptInstall, usePwa } from "../pwa";

/**
 * Install help for Settings: the browser's own install question where there is one, the Share-sheet steps on iPhone
 * and iPad, nothing once the app is installed. The note about saved data is always shown: it matters most to people
 * who have not installed.
 */
export function InstallApp() {
  const { canPrompt, installed } = usePwa();
  const ios = isIos();
  return (
    <fieldset className="sr-settings__group">
      <legend>Keep it on this device</legend>
      {installed ? (
        <p>This is the installed app. It works without a connection.</p>
      ) : (
        <>
          {canPrompt && (
            <button
              type="button"
              className="sr-settings__button"
              onClick={() => {
                void promptInstall();
              }}
            >
              Install the app
            </button>
          )}
          {ios && (
            <p>
              To install on an iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen.
            </p>
          )}
          {!canPrompt && !ios && (
            <p>
              To install, use your browser's menu: Install app, or Add to Home screen. Not every browser offers it.
            </p>
          )}
        </>
      )}
      <p className="sr-settings__hint">
        Your 'Mechs are saved in this browser, on this device only. A browser can clear a site's saved data if the site
        goes unused for a while: Safari on iPhone and iPad may do so after about a week unless the site is added to the
        Home Screen. Export the 'Mechs you want to keep, from each game's Home page, so you always have a copy.
      </p>
    </fieldset>
  );
}
