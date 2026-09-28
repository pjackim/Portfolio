/**
 * The home page's About section extras, fetched by the motion layer after load + idle (one
 * request for both): the timeline's constellation and the capabilities panel's lock-on and
 * hover intent. Both sections work without it.
 */
import { createTimeline } from './about-timeline';
import { wireCapabilities } from './capabilities';

const timeline = document.querySelector<HTMLElement>('[data-timeline]');
if (timeline) createTimeline(timeline);

const capabilities = document.querySelector<HTMLElement>('[data-caps]');
if (capabilities) wireCapabilities(capabilities);
