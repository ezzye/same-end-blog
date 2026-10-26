(() => {
  const saveButton = document.querySelector('#save-html');
  const shareButton = document.querySelector('#share-file');
  const status = document.querySelector('#file-status');
  if (!saveButton || !shareButton || !status) return;
  let cachedFile = null;
  let filePromise = null;

  const setBusy = (busy) => {
    saveButton.disabled = busy;
    shareButton.disabled = busy;
  };

  const toDataUrl = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not include ${url}`);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const makeOfflineFile = async () => {
    status.textContent = 'Preparing the offline article…';
    const clone = document.documentElement.cloneNode(true);
    const stylesheet = clone.querySelector('link[rel="stylesheet"]');
    const styleText = await (await fetch('../styles.css')).text();
    const style = document.createElement('style');
    style.textContent = styleText;
    stylesheet.replaceWith(style);

    const brandData = await toDataUrl('../assets/brand.png');
    clone.querySelectorAll('img[src$="brand.png"]').forEach((image) => image.setAttribute('src', brandData));
    const videoData = await toDataUrl('../assets/same-end-live-sharing.mp4');
    const source = clone.querySelector('#story-video source');
    if (source) source.setAttribute('src', videoData);
    const video = clone.querySelector('#story-video');
    if (video) video.setAttribute('poster', brandData);
    clone.querySelectorAll('a[href$="same-end-live-sharing.mp4"]').forEach((link) => link.setAttribute('href', 'https://blog.sameend.com/assets/same-end-live-sharing.mp4'));

    clone.querySelector('script[src$="offline-tools.js"]')?.remove();
    clone.querySelector('.share-tools')?.remove();
    clone.querySelectorAll('a[href^="../"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === '../') link.setAttribute('href', 'https://blog.sameend.com/');
      if (href?.includes('same-end-live-sharing-social.mp4')) link.setAttribute('href', 'https://blog.sameend.com/assets/same-end-live-sharing-social.mp4');
    });
    clone.querySelector('link[rel="canonical"]')?.remove();
    const html = '<!doctype html>\n' + clone.outerHTML;
    return new File([html], 'same-end-watch-with-your-mates.html', { type: 'text/html' });
  };

  const getOfflineFile = async () => {
    if (cachedFile) return cachedFile;
    if (!filePromise) {
      filePromise = makeOfflineFile()
        .then((file) => {
          cachedFile = file;
          return file;
        })
        .finally(() => { filePromise = null; });
    }
    return filePromise;
  };

  const downloadFile = (file) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  saveButton.addEventListener('click', async () => {
    setBusy(true);
    try {
      const file = await getOfflineFile();
      downloadFile(file);
      status.textContent = 'Offline article saved.';
    } catch (error) {
      status.textContent = 'The offline copy could not be prepared. You can still save this page from your browser.';
    } finally {
      setBusy(false);
    }
  });

  shareButton.addEventListener('click', async () => {
    setBusy(true);
    let file = null;
    try {
      file = await getOfflineFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Live sharing. Private mates. Your matchday with Same End.', files: [file] });
        status.textContent = 'Share sheet opened.';
      } else {
        downloadFile(file);
        status.textContent = 'File sharing is not available here, so the article was downloaded. Attach that file to your message.';
      }
    } catch (error) {
      if (error?.name === 'AbortError') status.textContent = 'Sharing cancelled.';
      else if (file) {
        downloadFile(file);
        status.textContent = 'File sharing is not available here, so the article was downloaded. Attach that file to your message.';
      } else status.textContent = 'Sharing is not available here. Use Save article, then attach the downloaded file.';
    } finally {
      setBusy(false);
    }
  });
})();

