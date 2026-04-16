export interface DemoImage {
  src: string;
  alt: string;
}

export interface DemoSection {
  id: string;
  heading: string;
  level: number;
  paragraphs: string[];
  image?: DemoImage;
  code?: string;
}

export interface ArticleTocDemoData {
  title: string;
  intro: string;
  sections: DemoSection[];
}
