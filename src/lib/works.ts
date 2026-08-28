import type { ImageMetadata } from 'astro';
import catImage from '../cat.png';
import mahoImage from '../maho.png';
import tadekuImage from '../tadeku.png';

export interface Work {
  slug: string;
  title: string;
  description: string;
  href: string;
  image?: ImageMetadata;
  imagePublic?: string;
  external?: boolean;
  featured?: boolean;
}

export const works: Work[] = [
  {
    slug: 'tadeku',
    title: '蓼食う本の虫',
    description: '読む・書くを身近にする文芸Webメディア。2016年3月から運営しています。',
    href: 'https://tadeku.net',
    image: tadekuImage,
    external: true,
    featured: true,
  },
  {
    slug: 'cat-in-the-park',
    title: 'Cat in the park.',
    description: '作業用の猫動画を投稿するプロジェクトです。',
    href: '/cat-in-the-park',
    image: catImage,
    featured: true,
  },
  {
    slug: 'tadeku-tools',
    title: 'tadeku-tools',
    description: '蓼食う本の虫が提供する、執筆に役立つツールをまとめています。',
    href: 'https://tools.tadeku.net',
    image: tadekuImage,
    external: true,
    featured: true,
  },
  {
    slug: 'maho-online',
    title: 'Maho ONLINE',
    description: '賢い魔法使いのためのニュースメディアです。',
    href: 'https://maho.online',
    image: mahoImage,
    external: true,
    featured: true,
  },
  {
    slug: 'hanoi-clicker',
    title: 'ハノイクリッカー',
    description: 'ハノイの塔を題材にした放置系ゲームです。円盤を移して功徳を積みます。',
    href: '/works/hanoi-clicker/',
    imagePublic: '/works/hanoi-clicker/preview.svg',
    featured: true,
  },
];

export function getFeaturedWorks(): Work[] {
  return works.filter((work) => work.featured);
}
