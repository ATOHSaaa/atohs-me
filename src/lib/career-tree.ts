export interface CareerListItem {
  text: string;
  children: CareerListItem[];
}

export interface CareerSubsection {
  title: string;
  items: CareerListItem[];
}

export interface CareerSection {
  title: string;
  items: CareerListItem[];
  subsections: CareerSubsection[];
}

export function inlineMarkdownToHtml(text: string): string {
  return text
    .replace(/\[([^\]]+?)\s+(https?:\/\/[^\s\]]+)\]/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function parseCareerBody(body: string): CareerSection[] {
  const sections: CareerSection[] = [];
  let current: CareerSection | null = null;
  let currentSub: CareerSubsection | null = null;

  const getItemList = (): CareerListItem[] => {
    if (!current) return [];
    if (currentSub) return currentSub.items;
    return current.items;
  };

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const h2 = /^## (.+)$/.exec(line);
    if (h2) {
      currentSub = null;
      current = { title: h2[1].trim(), items: [], subsections: [] };
      sections.push(current);
      continue;
    }

    const h3 = /^### (.+)$/.exec(line);
    if (h3 && current) {
      currentSub = { title: h3[1].trim(), items: [] };
      current.subsections.push(currentSub);
      continue;
    }

    const list = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (!list || !current) continue;

    const indent = list[1].length;
    const item: CareerListItem = { text: list[2].trim(), children: [] };
    const target = getItemList();

    if (indent >= 2 && target.length > 0) {
      target[target.length - 1].children.push(item);
    } else {
      target.push(item);
    }
  }

  return sections;
}
