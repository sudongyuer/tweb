import { SliderTab } from "../slider";
import SearchInput from "../searchInput";
import Scrollable from "../scrollable_new";
import LazyLoadQueue from "../lazyLoadQueue";
import animationIntersector from "../animationIntersector";
import appSidebarRight, { AppSidebarRight } from "../../lib/appManagers/appSidebarRight";
import appUsersManager, { User } from "../../lib/appManagers/appUsersManager";
import appInlineBotsManager, { AppInlineBotsManager } from "../../lib/appManagers/AppInlineBotsManager";
import GifsMasonry from "../gifsMasonry";

const ANIMATIONGROUP = 'GIFS-SEARCH';

export default class AppGifsTab implements SliderTab {
  private container = document.getElementById('search-gifs-container') as HTMLDivElement;
  private contentDiv = this.container.querySelector('.sidebar-content') as HTMLDivElement;
  private backBtn = this.container.querySelector('.sidebar-close-button') as HTMLButtonElement;
  //private input = this.container.querySelector('#stickers-search') as HTMLInputElement;
  private searchInput: SearchInput;
  private gifsDiv = this.contentDiv.firstElementChild as HTMLDivElement;
  private scrollable: Scrollable;
  private lazyLoadQueue: LazyLoadQueue;

  private nextOffset = '';

  private gifBotPeerID: number;
  private masonry: GifsMasonry;

  private searchPromise: ReturnType<AppInlineBotsManager['getInlineResults']>;

  constructor() {
    this.scrollable = new Scrollable(this.contentDiv, 'y', ANIMATIONGROUP, undefined, undefined, 2);
    this.scrollable.setVirtualContainer(this.gifsDiv);
    
    this.masonry = new GifsMasonry(this.gifsDiv);

    this.lazyLoadQueue = new LazyLoadQueue();

    this.searchInput = new SearchInput('Search GIFs', (value) => {
      this.reset();
      this.search(value);
    });
    
    this.scrollable.onScrolledBottom = () => {
      this.search(this.searchInput.value, false);
    };

    this.backBtn.parentElement.append(this.searchInput.container);
  }

  public onCloseAfterTimeout() {
    this.reset();
    this.gifsDiv.innerHTML = '';
    this.searchInput.value = '';
    animationIntersector.checkAnimations(undefined, ANIMATIONGROUP);
  }

  private reset() {
    this.searchPromise = null;
    this.nextOffset = '';
    this.lazyLoadQueue.clear();
  }

  public init() {
    appSidebarRight.selectTab(AppSidebarRight.SLIDERITEMSIDS.gifs);

    appSidebarRight.toggleSidebar(true).then(() => {
      //this.renderFeatured();
      this.search('', true);
      this.reset();
    });
  }

  public async search(query: string, newSearch = true) {
    if(this.searchPromise) return;

    if(!this.gifBotPeerID) {
      this.gifBotPeerID = (await appUsersManager.resolveUsername('gif')).id;
    }

    try {
      this.searchPromise = appInlineBotsManager.getInlineResults(0, this.gifBotPeerID, query, this.nextOffset);
      const { results, next_offset } = await this.searchPromise;

      if(this.searchInput.value != query) {
        return;
      }

      this.searchPromise = null;
      this.nextOffset = next_offset;
      if(newSearch) {
        this.gifsDiv.innerHTML = '';
      }

      results.forEach((result) => {
        if(result._ === 'botInlineMediaResult' && result.document) {
          this.masonry.add(result.document, ANIMATIONGROUP, this.lazyLoadQueue);
        }
      });

      this.scrollable.onScroll();
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
  }
}