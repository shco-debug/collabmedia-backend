class ContentArchitect {
    static parse(data) {
        return data;
    }
}

class TypographyCurator {
    static enhanceWithMarginalia() {
        // Add responsive font sizing based on viewport
        const paragraphs = document.querySelectorAll('.paragraph');
        paragraphs.forEach(p => {
            p.style.transition = 'font-size 0.3s ease';
        });
        console.log('Typography curated with responsive marginalia');
    }
}

class EleganceEngineer {
    static activateHoverStates() {
        // No hover effects for Manuscript mode - pure reading experience
        console.log('Hover states configured');
    }
}



class LuxeRead {
  constructor(content) {
    this.content = content;
    this.scrollProgress = 0;
    this.mode = 'manuscript';
    this.archiveSlug = (typeof window !== 'undefined' && window.__LUXE_ARCHIVE_SLUG__) || 'latest';
    this.chapterStateKey = `luxe_read_open_chapters_${this.archiveSlug}`;
    this.openChapters = this.loadOpenedChapters();
    this.thematicSignatures = this.generateThematicSignatures();
    this.allChaptersSingleWord = this.areAllChapterTitlesSingleWords();
    this.init();
  }
    
    init() {
        this.renderContent();
        this.bindEvents();
        this.initScrollPhysics();
        this.initProgressSculpture();
        this.initTemporalTheming();
        this.detectContemplationPauses();
        this.initAmbientSound();
        this.initChapterSymbol();
        this.initChapterPrompt();
    }
    
    initAmbientSound() {
        this.soundscape = new AmbientSoundscape();
        this.soundscape.init();
        this.setupSoundControlInteractions();
    }
    
    setupSoundControlInteractions() {
        const soundControl = document.getElementById('sound-control');
        const templateSwitcher = document.querySelector('.template-switcher');
        if (!soundControl || !templateSwitcher) return;
        soundControl.addEventListener('mouseenter', () => {
            templateSwitcher.classList.add('hidden-for-sound');
        });
        soundControl.addEventListener('mouseleave', () => {
            templateSwitcher.classList.remove('hidden-for-sound');
        });
    }
    
    generateThematicSignatures() {
        // Generate unique visual signatures for each chapter based on content
        const signatures = {};
        this.content.chapters.forEach((chapter, index) => {
            const keywords = this.extractKeywords(chapter.title);
            signatures[chapter.id] = {
                color: this.getColorFromKeywords(keywords, index),
                symbol: this.getSymbolFromKeywords(keywords),
                mood: this.detectMood(chapter.title)
            };
        });
        return signatures;
    }
    
    extractKeywords(text) {
        const words = text.toLowerCase().split(/\s+/);
        return words.filter(w => w.length > 3);
    }
    
    getColorFromKeywords(keywords, index) {
        const colors = [
            '#9aaba5', // sage
            '#c9a86a', // gold
            '#8b5a5a', // wine
            '#2d4a5c', // deep blue
            '#d4a59a', // soft coral
            '#7a8a70', // olive
            '#a88c8c'  // dusty rose
        ];
        return colors[index % colors.length];
    }
    
    getSymbolFromKeywords(keywords) {
        const symbols = ['◆', '○', '✦', '◇', '●', '◈', '✧'];
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    getDisplayTitle(sourceTitle) {
        if (typeof sourceTitle !== 'string') return '';
        return sourceTitle.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }

    sanitizeChapterWord(title) {
        if (typeof title !== 'string') return '';
        let sanitized = title.replace(/\p{Extended_Pictographic}/gu, '');
        sanitized = sanitized.replace(/[0-9]/g, '');
        sanitized = sanitized.replace(/[^A-Za-z]+/g, ' ');
        return sanitized.trim();
    }

    areAllChapterTitlesSingleWords() {
        if (!this.content || !Array.isArray(this.content.chapters) || !this.content.chapters.length) {
            return false;
        }
        return this.content.chapters.every(chapter => {
            const normalized = this.sanitizeChapterWord(chapter && chapter.title ? chapter.title : '');
            if (!normalized) return false;
            const parts = normalized.split(/\s+/).filter(Boolean);
            return parts.length === 1;
        });
    }
    
    extractChapterIcon(title) {
        if (!title) return null;
        try {
            const emojiMatch = title.match(/\p{Extended_Pictographic}/u);
            if (emojiMatch) return emojiMatch[0];
        } catch (err) {
            // Property escapes not supported - fall back to manual ranges
        }
        const fallbackMatch = title.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u);
        return fallbackMatch ? fallbackMatch[0] : null;
    }
    
    detectMood(text) {
        if (text.includes('vanish') || text.includes('floor')) return 'ethereal';
        if (text.includes('unseen') || text.includes('root')) return 'grounded';
        if (text.includes('stranger') || text.includes('bow')) return 'contemplative';
        return 'reflective';
    }
    
    isQuoteParagraph(text) {
        if (typeof text !== 'string') return false;
        return text.trim().startsWith('(q)');
    }
    
    renderTextWithBrackets(element, text) {
        const quotePatternEnd = /\(q\)$/;
        const quotePatternStart = /^\(q\)/;
        const sourceText = typeof text === 'string' ? text : '';
        const trimmedSource = sourceText.trim();
        let processedText = trimmedSource;
        let isQuote = false;
        let isParagraphItalic = false;
        
        if (quotePatternEnd.test(trimmedSource) || quotePatternStart.test(trimmedSource)) {
            processedText = trimmedSource.replace(/\(q\)/g, '').trim();
            isQuote = true;
        } else {
            const startsWithItalic = trimmedSource.startsWith('(i)');
            const endsWithItalic = trimmedSource.endsWith('(i)');
            if (startsWithItalic && endsWithItalic) {
                const innerText = trimmedSource.slice(3, -3);
                if (innerText.indexOf('(i)') === -1) {
                    processedText = innerText.trim();
                    isParagraphItalic = true;
                }
            } else {
                const startsWithUnderline = trimmedSource.startsWith('(u)');
                const endsWithUnderline = trimmedSource.endsWith('(u)');
                if (startsWithUnderline && endsWithUnderline) {
                    const innerText = trimmedSource.slice(3, -3);
                    if (innerText.indexOf('(u)') === -1) {
                        processedText = innerText.trim();
                        isQuote = true;
                        element.classList.add('underline-style');
                    }
                }
            }
        }
        
        this.appendFormattedSpans(element, processedText);
        
        if (isQuote) {
            element.classList.add('quote-style');
        }
        if (isParagraphItalic) {
            element.classList.add('italic-style');
        }
    }
    
    appendFormattedSpans(element, text) {
        const tokenRegex = /(\(i\)([\s\S]*?)\(i\)|\(u\)([\s\S]*?)\(u\)|\[[^\]]+\])/g;
        let lastIndex = 0;
        let match;
        
        while ((match = tokenRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                element.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            
            const token = match[0];
            if (token.startsWith('(i)')) {
                const em = document.createElement('em');
                em.textContent = match[2];
                element.appendChild(em);
            } else if (token.startsWith('(u)')) {
                const underlineSpan = document.createElement('span');
                underlineSpan.className = 'underline-text';
                underlineSpan.textContent = match[3];
                element.appendChild(underlineSpan);
            } else if (token.startsWith('[')) {
                const boldSpan = document.createElement('strong');
                boldSpan.textContent = token.slice(1, -1);
                element.appendChild(boldSpan);
            }
            
            lastIndex = tokenRegex.lastIndex;
        }
        
        if (lastIndex < text.length) {
            element.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
    }
    
    containsTableStructure(text) {
        if (!text) return false;
        return text.includes('(table)') && text.includes('(/table)');
    }
    
    createNarrativeElement(text) {
        if (this.containsTableStructure(text)) {
            return { element: this.buildTableElement(text), isParagraph: false };
        }
        const p = document.createElement('p');
        p.className = 'paragraph';
        this.renderTextWithBrackets(p, text);
        return { element: p, isParagraph: true };
    }

    extractContemplationMarkers(text) {
        if (typeof text !== 'string') {
            return { text: '', leadingMarkers: 0, trailingMarkers: 0 };
        }
        let working = text;
        let leadingMarkers = 0;
        let trailingMarkers = 0;
        const leadingPattern = /^\s*◆/;
        while (leadingPattern.test(working)) {
            leadingMarkers++;
            working = working.replace(leadingPattern, '');
        }
        const trailingPattern = /◆\s*$/;
        while (trailingPattern.test(working)) {
            trailingMarkers++;
            working = working.replace(trailingPattern, '');
        }
        return {
            text: working.trim(),
            leadingMarkers,
            trailingMarkers
        };
    }

    splitInlineContemplationSegments(text) {
        if (!text) return [];
        const segments = [];
        let buffer = '';
        let lastWasPause = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '◆') {
                if (buffer.trim().length) {
                    segments.push({ type: 'text', value: buffer.trim() });
                }
                buffer = '';
                if (!lastWasPause) {
                    segments.push({ type: 'pause' });
                    lastWasPause = true;
                }
            } else {
                buffer += char;
                lastWasPause = false;
            }
        }
        if (buffer.trim().length) {
            segments.push({ type: 'text', value: buffer.trim() });
        }
        return segments;
    }

    splitInlineQuoteSegments(text) {
        if (typeof text !== 'string' || !text.length) {
            return [];
        }
        const segments = [];
        const regex = /\(q\)/g;
        let lastIndex = 0;
        let inQuote = false;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const chunk = text.slice(lastIndex, match.index);
            if (chunk.trim().length) {
                segments.push({ type: inQuote ? 'quote' : 'text', value: chunk });
            }
            inQuote = !inQuote;
            lastIndex = regex.lastIndex;
        }
        const tail = text.slice(lastIndex);
        if (tail.trim().length) {
            segments.push({ type: inQuote ? 'quote' : 'text', value: tail });
        }
        return segments.length ? segments : [{ type: 'text', value: text }];
    }

    extractInlineSectionTitle(text) {
        if (typeof text !== 'string') {
            return { title: null, text: '' };
        }
        const match = text.match(/^\s*\[([^\]]+)\]\s*/);
        if (!match) {
            return { title: null, text };
        }
        const remaining = text.slice(match[0].length);
        return {
            title: match[1].trim(),
            text: remaining
        };
    }
    
    buildTableElement(text) {
        const tableData = this.parseTableContent(text);
        const wrapper = document.createElement('div');
        wrapper.className = 'lux-table-wrapper';
        
        if (!tableData || !tableData.header.length) {
            const fallback = document.createElement('p');
            fallback.className = 'paragraph';
            this.renderTextWithBrackets(fallback, text.replace('(table)', '').replace('(/table)', ''));
            wrapper.appendChild(fallback);
            return wrapper;
        }
        
        const table = document.createElement('table');
        table.className = 'lux-table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        tableData.header.forEach(cell => {
            const th = document.createElement('th');
            th.textContent = cell;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        tableData.rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
    }
    
    parseTableContent(text) {
        const start = text.indexOf('(table)');
        const end = text.indexOf('(/table)');
        if (start === -1 || end === -1) return null;
        const inner = text.slice(start + 7, end).replace(/\r/g, '').trim();
        if (!inner) return null;
        
        let rows = inner.split(/\n+/).map(row => row.trim()).filter(Boolean);
        
        if (rows.length <= 1) {
            const inlineCells = inner.split('|').map(cell => cell.trim()).filter(Boolean);
            if (!inlineCells.length) return null;
            const columnCount = inlineCells.length >= 4 ? 2 : inlineCells.length || 1;
            rows = [];
            for (let i = 0; i < inlineCells.length; i += columnCount) {
                rows.push(inlineCells.slice(i, i + columnCount));
            }
        } else {
            rows = rows.map(row => row.split('|').map(cell => cell.trim()).filter(Boolean)).filter(row => row.length);
        }
        
        if (!rows.length) return null;
        const header = rows.shift();
        return { header, rows };
    }
    
    createContemplationPause() {
        const pause = document.createElement('div');
        pause.className = 'contemplation-pause';
        return pause;
    }

    appendContemplationPause(container) {
        if (!container) return;
        const last = container.lastElementChild;
        if (last && last.classList && last.classList.contains('contemplation-pause')) {
            return;
        }
        container.appendChild(this.createContemplationPause());
    }
    
    renderContent() {
        const canvas = document.querySelector('.content-canvas');
        canvas.innerHTML = '';

        if (typeof document !== 'undefined') {
            document.body.classList.toggle('single-word-chapters', !!this.allChaptersSingleWord);
        }
        
        // Split title by colon, omitting any parenthetical segments
        const rawTitle = (this.content.metadata && this.content.metadata.title) || '';
        const sanitizedTitle = this.getDisplayTitle(rawTitle);
        const displayTitle = (sanitizedTitle || 'Untitled Journey').trim();
        const colonIndex = displayTitle.indexOf(':');
        
        const titleElement = document.createElement('h1');
        titleElement.className = 'book-title';
        
        if (colonIndex !== -1) {
            const mainTitle = displayTitle.substring(0, colonIndex).trim();
            const subtitle = displayTitle.substring(colonIndex + 1).trim();
            
            titleElement.textContent = mainTitle || displayTitle;
            canvas.appendChild(titleElement);
            
            if (subtitle) {
                const subtitleElement = document.createElement('span');
                subtitleElement.className = 'book-subtitle';
                subtitleElement.textContent = subtitle;
                canvas.appendChild(subtitleElement);
            }
        } else {
            titleElement.textContent = displayTitle;
            canvas.appendChild(titleElement);
        }
        
        this.content.chapters.forEach((chapter, chapterIndex) => {
            // Add interlude before chapter (except first)
            if (chapterIndex > 0) {
                const interlude = this.createChapterInterlude(chapter, chapterIndex);
                canvas.appendChild(interlude);
            }
            
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter';
            chapterDiv.id = chapter.id;
            chapterDiv.dataset.chapterIndex = chapterIndex;
            
            // Apply thematic signature
            if (this.thematicSignatures[chapter.id]) {
                chapterDiv.style.setProperty('--chapter-color', this.thematicSignatures[chapter.id].color);
            }
            
            const chapterContent = document.createElement('div');
            chapterContent.className = 'chapter-content';
            
            const chapterTitle = document.createElement('h2');
            chapterTitle.className = 'chapter-title';
            chapterTitle.textContent = chapter.title;
            chapterContent.appendChild(chapterTitle);
            
            chapter.sections.forEach((section, sectionIndex) => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'section';
                
                if (section.title && section.title.trim().length > 0) {
                    const sectionTitle = document.createElement('h3');
                    sectionTitle.className = 'section-title';
                    sectionTitle.textContent = section.title;
                    sectionDiv.appendChild(sectionTitle);
                }
                
                let hasInsertedContent = false;
                section.paragraphs.forEach((para, paraIndex) => {
                    const markerInfo = this.extractContemplationMarkers(para.text);
                    const normalizedText = markerInfo.text.replace(/^\s+/gm, '');
                    for (let i = 0; i < markerInfo.leadingMarkers; i++) {
                        this.appendContemplationPause(sectionDiv);
                    }
                    const titleInfo = this.extractInlineSectionTitle(normalizedText);
                    if (titleInfo.title) {
                        const inlineTitleEl = document.createElement('p');
                        inlineTitleEl.className = 'paragraph inline-bracket-title';
                        const strong = document.createElement('strong');
                        strong.textContent = titleInfo.title;
                        inlineTitleEl.appendChild(strong);
                        sectionDiv.appendChild(inlineTitleEl);
                        hasInsertedContent = true;
                    }
                    const quoteSegments = this.splitInlineQuoteSegments(titleInfo.text);
                    if (!quoteSegments.length) {
                        for (let i = 0; i < markerInfo.trailingMarkers; i++) {
                            this.appendContemplationPause(sectionDiv);
                        }
                        return;
                    }
                    quoteSegments.forEach((quoteSegment, quoteIndex) => {
                        const segments = this.splitInlineContemplationSegments(quoteSegment.value);
                        if (!segments.length) return;
                        segments.forEach((segment, segmentIndex) => {
                            if (segment.type === 'pause') {
                                this.appendContemplationPause(sectionDiv);
                                return;
                            }
                            const textForAnalysis = segment.value;
                            if (!textForAnalysis) return;
                            const isQuoteParagraph = quoteSegment.type === 'quote' || this.isQuoteParagraph(textForAnalysis);
                            if (isQuoteParagraph && hasInsertedContent) {
                                this.appendContemplationPause(sectionDiv);
                            }
                            const narrativeNode = this.createNarrativeElement(textForAnalysis);
                            const node = narrativeNode.element;
                            
                            if (isQuoteParagraph && narrativeNode.isParagraph) {
                                node.classList.add('quote-style');
                            }
                            
                            if (narrativeNode.isParagraph) {
                                // Add emotional weight detection
                                const weight = this.detectEmotionalWeight(textForAnalysis);
                                if (weight === 'high') {
                                    node.setAttribute('data-weight', 'high');
                                }
                                
                                // Add marginalia insight
                                const insight = this.generateMarginalia(textForAnalysis, chapterIndex, sectionIndex);
                                if (insight) {
                                    node.setAttribute('data-insight', insight);
                                }
                                
                                node.dataset.favoriteId = `${chapter.id}-${section.id}-${para.id}-seg${quoteIndex}-${segmentIndex}`;
                                node.dataset.chapterId = chapter.id;
                                node.dataset.sectionId = section.id;
                                
                                const checkBtn = document.createElement('button');
                                checkBtn.type = 'button';
                                checkBtn.className = 'paragraph-check';
                                checkBtn.setAttribute('title', '');
                                const srLabel = document.createElement('span');
                                srLabel.className = 'sr-only';
                                srLabel.textContent = 'Toggle favorite';
                                checkBtn.appendChild(srLabel);
                                const checkIcon = document.createElement('span');
                                checkIcon.className = 'paragraph-checkmark';
                                checkIcon.setAttribute('aria-hidden', 'true');
                                checkIcon.textContent = '✓';
                                checkBtn.appendChild(checkIcon);
                                const suppressTooltip = () => node.classList.add('tooltip-suppressed');
                                const restoreTooltip = () => node.classList.remove('tooltip-suppressed');
                                checkBtn.addEventListener('mouseenter', suppressTooltip);
                                checkBtn.addEventListener('mouseleave', restoreTooltip);
                                checkBtn.addEventListener('focus', suppressTooltip);
                                checkBtn.addEventListener('blur', restoreTooltip);
                                node.appendChild(checkBtn);
                            }
                            
                            sectionDiv.appendChild(node);
                            hasInsertedContent = true;
                            
                            if (isQuoteParagraph) {
                                this.appendContemplationPause(sectionDiv);
                            }
                        });
                    });
                    
                    for (let i = 0; i < markerInfo.trailingMarkers; i++) {
                        this.appendContemplationPause(sectionDiv);
                    }
                    
                    // Insert contemplation pause after dense sections
                    if (this.shouldPauseHere(section, paraIndex)) {
                        this.appendContemplationPause(sectionDiv);
                    }
                });
                
                chapterContent.appendChild(sectionDiv);
            });
            
            chapterDiv.appendChild(chapterContent);
            canvas.appendChild(chapterDiv);
        });
        
        // Initialize chapter navigation
        this.initManuscriptNavigation();
        this.restoreOpenedChapters();
    }
    
    createChapterInterlude(chapter, chapterIndex) {
        const interlude = document.createElement('div');
        interlude.className = 'chapter-interlude';
        interlude.dataset.targetChapter = chapter.id;
        
        const number = document.createElement('div');
        number.className = 'interlude-number';
        number.textContent = this.romanize(chapterIndex);
        
        const ornament1 = document.createElement('div');
        ornament1.className = 'interlude-ornament';
        
        const title = document.createElement('h2');
        title.className = 'interlude-title';
        title.textContent = chapter.title;
        
        const ornament2 = document.createElement('div');
        ornament2.className = 'interlude-ornament';
        
        const prompt = document.createElement('div');
        prompt.className = 'interlude-prompt';
        prompt.textContent = 'Click to Continue';
        
        interlude.appendChild(number);
        interlude.appendChild(ornament1);
        interlude.appendChild(title);
        interlude.appendChild(ornament2);
        interlude.appendChild(prompt);
        
        // Click handler
        interlude.addEventListener('click', () => {
            this.transitionToChapter(interlude, chapter.id);
        });
        
        return interlude;
    }
    
    romanize(num) {
        const lookup = {1:'I',2:'II',3:'III',4:'IV',5:'V',6:'VI',7:'VII',8:'VIII',9:'IX',10:'X'};
        return lookup[num] || num.toString();
    }
    
    transitionToChapter(interlude, chapterId) {
        // Elegant fade out interlude with extended timing
        interlude.classList.add('fadeout');
        
        setTimeout(() => {
            interlude.style.display = 'none';
            
            // Scroll to chapter position
            const chapter = document.getElementById(chapterId);
            if (chapter) {
                // Smooth scroll with offset for better reveal
                const yOffset = -50;
                const y = chapter.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
                
                // Trigger elegant chapter entrance after scroll settles
                setTimeout(() => {
                    this.activateChapter(chapterId, { animate: true });
                }, 800);
            }
        }, 2000);
    }
    
    initManuscriptNavigation() {
        // Hide all chapters initially except first
        const chapters = document.querySelectorAll('.chapter');
        chapters.forEach((chapter, index) => {
            if (index === 0) {
                chapter.classList.add('active');
                this.markChapterOpened(chapter.id);
            }
        });
    }
    
    detectEmotionalWeight(text) {
        const highWeightWords = ['sacred', 'divine', 'profound', 'essential', 'deeper', 'truth', 'invisible', 'sacred', 'surrender'];
        const wordCount = highWeightWords.filter(word => text.toLowerCase().includes(word)).length;
        return wordCount >= 2 ? 'high' : 'normal';
    }
    
    generateMarginalia(text, chapterIndex, sectionIndex) {
        // Generate contextual connections
        const insights = [
            '✦ A thread to earlier reflections',
            '◇ Consider the inverse here',
            '● Notice the shift in tone',
            '✧ This echoes forward',
            '◈ A turning point',
            '○ The heart of the matter'
        ];
        return Math.random() > 0.7 ? insights[Math.floor(Math.random() * insights.length)] : null;
    }
    
    shouldPauseHere(section, paraIndex) {
        // Insert pauses after clusters of dense content
        return paraIndex === Math.floor(section.paragraphs.length / 2) && section.paragraphs.length > 3;
    }
    
    createContemplationPause() {
        const pause = document.createElement('div');
        pause.className = 'contemplation-pause';
        return pause;
    }
    
    bindEvents() {
        // Track scroll for progress and temporal theming
        window.addEventListener('scroll', () => {
            this.updateScrollProgress();
            this.updateChapterSymbol();
            this.checkChapterPrompt();
        }, { passive: true });
    }
    
  initScrollPhysics() {
    const paragraphs = Array.from(document.querySelectorAll('.paragraph'));
    const sectionTitles = Array.from(document.querySelectorAll('.section-title'));
    const revealTargets = [...paragraphs, ...sectionTitles];
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vibeIsUES = document.body.classList.contains('vibe-ues');
    const momentumEnabled = !prefersReducedMotion && !vibeIsUES;

    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;
    let ticking = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        
        // Skip reveals in UES mode to prevent flickering during scroll
        if (document.body.classList.contains('vibe-ues')) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
          return;
        }
        
        const batchIndex = Number(entry.target.dataset.revealIndex || 0);
        const delay = Math.min(batchIndex, 8) * 80;
        setTimeout(() => entry.target.classList.add('revealed'), delay);
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealTargets.forEach((target, index) => {
      target.dataset.revealIndex = index % 10;
      observer.observe(target);
    });

    const applyScrollEffects = () => {
      const currentScroll = window.scrollY;
      scrollVelocity = (currentScroll - lastScrollY) * 0.8;
      lastScrollY = currentScroll;

      if (momentumEnabled && this.mode === 'manuscript' && !document.body.classList.contains('vibe-ues')) {
        paragraphs.forEach((p, index) => {
          const rect = p.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          if (!isVisible) {
            p.style.transform = '';
            return;
          }
          const scrollEffect = Math.sin((scrollVelocity + index) * 0.1);
          p.style.transform = `translate3d(0, ${scrollEffect}px, 0)`;
        });
      } else {
        paragraphs.forEach((p) => {
          if (p.style.transform) {
            p.style.transform = '';
          }
        });
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      window.requestAnimationFrame(applyScrollEffects);
      ticking = true;
    }, { passive: true });

    applyScrollEffects();
  }
    
    initProgressSculpture() {
        // Create organic SVG sculpture in margin
        const sculpture = document.createElement('div');
        sculpture.className = 'progress-sculpture';
        sculpture.innerHTML = `
            <svg viewBox="0 0 60 400" xmlns="http://www.w3.org/2000/svg">
                <path d="M 30 0 Q 10 100 30 200 T 30 400" class="sculpture-base" />
                <path d="M 30 0 Q 10 100 30 200 T 30 400" class="progress-fill" />
            </svg>
        `;
        document.body.appendChild(sculpture);
    }
    
    initTemporalTheming() {
        // Colors shift as you read through the work
        this.updateScrollProgress();
    }
    
    updateScrollProgress() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = window.scrollY / scrollHeight;
        this.scrollProgress = Math.min(Math.max(progress, 0), 1);
        
        // Update CSS variable for temporal theming
        document.documentElement.style.setProperty('--read-progress', this.scrollProgress);
    }
    
    detectContemplationPauses() {
        // Already handled in renderContent with shouldPauseHere
        console.log('Contemplation pauses detected and inserted');
    }
    
    initChapterSymbol() {
        this.chapterSymbolEl = document.getElementById('chapter-symbol');
        this.chapterTitleEl = document.getElementById('mode-indicator');
        this.currentChapterId = null;
        
        const fallbackSymbols = ['✨','🕯','🌬','🎯','🌟','🛤','◆','○','✦','◇','◈'];
        this.chapterSymbols = {};
        this.content.chapters.forEach((chapter, index) => {
            const derived = this.extractChapterIcon(chapter.title);
            this.chapterSymbols[chapter.id] = derived || fallbackSymbols[index % fallbackSymbols.length];
        });
        
        // Get book title (text before first colon) without parenthetical descriptors
        const rawTitle = (this.content.metadata && this.content.metadata.title) || '';
        const sanitizedTitle = this.getDisplayTitle(rawTitle);
        const indicatorTitle = (sanitizedTitle || 'Untitled Journey').trim();
        const colonIndex = indicatorTitle.indexOf(':');
        this.bookTitle = (colonIndex !== -1 ? indicatorTitle.substring(0, colonIndex).trim() : indicatorTitle) || 'Untitled Journey';
        
        // Map chapter IDs to their display titles (without emojis)
        this.chapterTitles = {};
        this.content.chapters.forEach(chapter => {
            const cleanTitle = (chapter.title || '').trim();
            this.chapterTitles[chapter.id] = cleanTitle;
        });
        
        // Update symbol and title on scroll
        this.updateChapterSymbol();
    }
    
    updateChapterSymbol() {
        const chapters = document.querySelectorAll('.chapter');
        const windowMid = window.innerHeight / 2;
        const scrollY = window.scrollY;
        let activeChapter = null;
        let chapterProgress = 0;
        
        // If we're at the very top, show book title
        if (scrollY < 200) {
            if (this.chapterTitleEl.textContent !== this.bookTitle) {
                this.chapterTitleEl.style.opacity = '0';
                setTimeout(() => {
                    this.chapterTitleEl.textContent = this.bookTitle;
                    this.chapterTitleEl.style.opacity = '0.5';
                }, 300);
            }
            // Reset current chapter ID so it can switch properly when scrolling down
            this.currentChapterId = null;
            return;
        }
        
        chapters.forEach(chapter => {
            const rect = chapter.getBoundingClientRect();
            const chapterTop = rect.top;
            const chapterBottom = rect.bottom;
            const chapterHeight = rect.height;
            
            // Check if this chapter is in the viewport center
            if (chapterTop < windowMid && chapterBottom > windowMid) {
                activeChapter = chapter;
                
                // Calculate progress through this chapter (0 to 1)
                const scrolledIntoChapter = windowMid - chapterTop;
                chapterProgress = Math.max(0, Math.min(1, scrolledIntoChapter / chapterHeight));
            }
        });
        
        if (activeChapter) {
            const chapterId = activeChapter.id;
            
            // Change symbol and title if we switched chapters
            if (chapterId !== this.currentChapterId) {
                this.currentChapterId = chapterId;
                const symbol = this.chapterSymbols[chapterId] || '◆';
                const chapterTitle = this.chapterTitles[chapterId] || '';
                
                // Animate out old symbol, animate in new one
                this.chapterSymbolEl.classList.add('changing');
                this.chapterTitleEl.style.opacity = '0';
                
                setTimeout(() => {
                    this.chapterSymbolEl.textContent = symbol;
                    this.chapterSymbolEl.classList.remove('changing');
                    this.chapterTitleEl.textContent = chapterTitle;
                    this.chapterTitleEl.style.opacity = '0.5';
                }, 400);
            }
            
            // Calculate opacity based on chapter progress
            // Start at 20%, peak at 100% at 50% progress, fade back to 20% at end
            let opacity;
            if (chapterProgress <= 0.5) {
                // 0 to 50%: fade from 0.2 to 1.0
                opacity = 0.2 + (chapterProgress * 2) * 0.8;
            } else {
                // 50% to 100%: fade from 1.0 to 0.2
                opacity = 1.0 - ((chapterProgress - 0.5) * 2) * 0.8;
            }
            
            this.chapterSymbolEl.style.opacity = opacity;
        }
    }
    
    initChapterPrompt() {
        console.log('Initializing chapter prompt...');
        
        // Create floating prompt element
        this.chapterPrompt = document.createElement('div');
        this.chapterPrompt.className = 'chapter-prompt-float';
        this.chapterPrompt.innerHTML = `
            <div class="chapter-prompt-label">Open</div>
            <div class="chapter-prompt-text"></div>
        `;
        document.body.appendChild(this.chapterPrompt);
        
        console.log('Chapter prompt element created and appended to body:', this.chapterPrompt);
        
        this.currentPromptChapter = null;
        this.chapterPromptSuspended = false;
        
        // Click handler for the prompt
        this.chapterPrompt.addEventListener('click', () => {
            console.log('Chapter prompt clicked for:', this.currentPromptChapter);
            if (this.currentPromptChapter) {
                const chapterDiv = document.getElementById(this.currentPromptChapter);
                
                // Find the interlude for this chapter
                const interlude = document.querySelector(`[data-target-chapter="${this.currentPromptChapter}"]`);
                
                if (interlude && chapterDiv) {
                    // Set flag to prevent other processes from triggering entrance animation
                    this.scrollingToChapter = true;
                    
                    // Lock cursor during scroll
                    document.body.classList.add('scrolling-auto');
                    
                    // Immediately hide interlude
                    interlude.style.display = 'none';
                    
                    // Keep chapter hidden (don't add active yet)
                    chapterDiv.classList.remove('chapter-entering');
                    
                    // Scroll to the exact top of chapter
                    const rect = chapterDiv.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetTop = rect.top + scrollTop;
                    
                    window.scrollTo({ 
                        top: targetTop,
                        behavior: 'smooth' 
                    });
                    
                    console.log('Scrolling to chapter, will activate and animate after 1500ms');
                    
                    // Activate and animate chapter after scroll completes
                    setTimeout(() => {
                        this.activateChapter(this.currentPromptChapter, { animate: true });
                        this.scrollingToChapter = false;
                        // Remove cursor lock
                        document.body.classList.remove('scrolling-auto');
                        console.log('Activated chapter with entrance animation:', this.currentPromptChapter);
                    }, 1500);
                } else if (chapterDiv) {
                    // No interlude (shouldn't happen for chapters 1+), just activate
                    this.activateChapter(this.currentPromptChapter, { animate: true });
                    console.log('Activated chapter:', this.currentPromptChapter);
                }
                
                // Hide the prompt
                this.chapterPrompt.classList.remove('visible');
                this.currentPromptChapter = null;
            }
        });
    }
    
    checkChapterPrompt() {
        if (!this.chapterPrompt || this.chapterPromptSuspended) return;
        
        const chapters = document.querySelectorAll('.chapter');
        const windowTop = window.scrollY;
        const windowBottom = windowTop + window.innerHeight;
        const windowMid = windowTop + (window.innerHeight / 2);
        let foundInactiveChapter = null;
        
        // Find the first inactive chapter in viewport
        for (let chapter of chapters) {
            // Skip chapter_0 (intro) as it's always visible
            if (chapter.id === 'chapter_0') continue;
            
            const rect = chapter.getBoundingClientRect();
            const chapterTop = rect.top + windowTop;
            const chapterBottom = rect.bottom + windowTop;
            
            // Check if we've scrolled past the interlude into the chapter area
            const interlude = document.querySelector(`[data-target-chapter="${chapter.id}"]`);
            let interludeBottom = chapterTop; // Default: interlude ends at chapter start
            
            if (interlude) {
                const interludeRect = interlude.getBoundingClientRect();
                interludeBottom = interludeRect.bottom + windowTop;
            }
            
            // Check if we're past the interlude and in the (inactive) chapter content area
            const isActive = chapter.classList.contains('active');
            const isPastInterlude = windowTop > interludeBottom;
            const isInChapterArea = windowMid > chapterTop && windowMid < chapterBottom;
            
            console.log('Checking chapter:', chapter.id, {
                isActive,
                isPastInterlude,
                isInChapterArea,
                windowTop,
                interludeBottom,
                chapterTop,
                chapterBottom,
                windowMid
            });
            
            // Show prompt if: we're in the chapter area, past the interlude, and chapter is not active
            if (isInChapterArea && isPastInterlude && !isActive) {
                foundInactiveChapter = chapter.id;
                console.log('✓ Found inactive chapter in viewport:', foundInactiveChapter);
                break;
            }
        }
        
        // If found an inactive chapter
        if (foundInactiveChapter) {
            // Update prompt if it's a different chapter
            if (this.currentPromptChapter !== foundInactiveChapter) {
                this.currentPromptChapter = foundInactiveChapter;
                const chapterTitle = this.chapterTitles[foundInactiveChapter] || 'Chapter';
                const promptText = this.chapterPrompt.querySelector('.chapter-prompt-text');
                promptText.textContent = chapterTitle;
                console.log('→ Showing prompt for:', chapterTitle);
            }
            // Show the prompt
            this.chapterPrompt.classList.add('visible');
        } else {
            // No inactive chapter in viewport - hide prompt
            this.chapterPrompt.classList.remove('visible');
            if (this.currentPromptChapter !== null) {
                console.log('← Hiding prompt');
                this.currentPromptChapter = null;
            }
        }
    }
    
  setChapterPromptSuspended(isSuspended) {
    this.chapterPromptSuspended = !!isSuspended;
    if (!this.chapterPrompt) return;
    if (this.chapterPromptSuspended) {
      this.chapterPrompt.classList.remove('visible');
      this.chapterPrompt.classList.add('toc-hidden');
    } else {
      this.chapterPrompt.classList.remove('toc-hidden');
    }
  }

  activateChapter(chapterId, options = {}) {
    if (!chapterId) return;
    const { animate = false, persist = true } = options;
    const chapter = document.getElementById(chapterId);
    if (!chapter) return;

    chapter.classList.add('active');
    if (animate) {
      chapter.classList.add('chapter-entering');
    }

    const interlude = document.querySelector(`[data-target-chapter="${chapterId}"]`);
    if (interlude) {
      interlude.classList.add('fadeout');
      interlude.style.display = 'none';
    }

    if (persist) {
      this.markChapterOpened(chapterId);
    }
  }

  loadOpenedChapters() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return new Set();
    }
    try {
      const raw = window.localStorage.getItem(this.chapterStateKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(Boolean));
      }
    } catch (error) {
      console.warn('Unable to load chapter history', error);
    }
    return new Set();
  }

  persistOpenedChapters() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.chapterStateKey, JSON.stringify(Array.from(this.openChapters)));
    } catch (error) {
      console.warn('Unable to persist chapter history', error);
    }
  }

  markChapterOpened(chapterId) {
    if (!chapterId || !this.openChapters) return;
    if (this.openChapters.has(chapterId)) return;
    this.openChapters.add(chapterId);
    this.persistOpenedChapters();
  }

  restoreOpenedChapters() {
    if (!this.openChapters || !this.openChapters.size) return;
    this.openChapters.forEach((chapterId) => {
      if (chapterId === 'chapter_0') return;
      this.activateChapter(chapterId, { animate: false, persist: false });
    });
  }
}
