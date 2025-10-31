import Hls, { LoaderContext, LoaderConfiguration, LoaderCallbacks } from 'hls.js';

export class CustomFragmentLoader extends Hls.DefaultConfig.loader {
  baseUrl: string;
  constructor(config: any) {
    super(config);
    this.baseUrl = config.baseUrl;
    this.load = this.load.bind(this);
  }
  load(context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>) {
    let url = context.url;
    const isLocalhostUrl = url.includes('//localhost');
    if (!/^(https?:)?\/\//.test(url) || isLocalhostUrl) {
      if (isLocalhostUrl) {
        try {
          const urlObject = new URL(url);
          url = urlObject.pathname.substring(1);
        } catch (e) { /* Ignore */ }
      }
      url = this.baseUrl + url;
    }
    context.url = `/proxy?url=${encodeURIComponent(url)}`;
    super.load(context, config, callbacks);
  }
}