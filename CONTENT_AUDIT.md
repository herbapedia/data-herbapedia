# data-herbapedia Content Audit Report

Generated: 2026-02-23
Updated: 2026-02-23

## Summary

| Category | Total References | Missing | Coverage |
|----------|-----------------|---------|----------|
| Botanical Species | 177 | 5 | 97.2% |
| Preparations | 194 | 20 | 89.7% |
| **Total** | **371** | **25** | **93.3%** |

---

## 1. Missing Botanical Species Images (5)

| Slug | Expected Path |
|------|--------------|
| chamomile | `media/images/chamomile/chamomile.jpg` |
| hawthorn | `media/images/hawthorn/hawthorn.jpg` |
| turmeric | `media/images/turmeric/turmeric.jpg` |
| valerian | `media/images/valerian/valerian.jpg` |
| zingiber-officinale | `media/images/zingiber-officinale/main.jpg` |

**Note:** Ginger (Zingiber officinale) image added at `media/images/zingiber-officinale/zingiber-officinale.jpg`

---

## 2. Missing Preparation Images (20)

| Slug | Expected Path |
|------|--------------|
| chamomile | `media/images/chamomile/chamomile.jpg` |
| curcumin-supplement | `media/images/curcumin-supplement/curcumin-supplement.jpg` |
| dried-ginger-rhizome | `media/images/dried-ginger-rhizome/dried-ginger-rhizome.jpg` |
| dried-ginger | `media/images/dried-ginger/dried-ginger.jpg` |
| fresh-ginger-rhizome | `media/images/fresh-ginger-rhizome/fresh-ginger-rhizome.jpg` |
| fresh-turmeric | `media/images/fresh-turmeric/fresh-turmeric.jpg` |
| ginger-tea | `media/images/ginger-tea/ginger-tea.jpg` |
| ginger-tincture | `media/images/ginger-tincture/ginger-tincture.jpg` |
| ginseng-extract | `media/images/ginseng-extract/ginseng-extract.jpg` |
| ginseng-root | `media/images/ginseng-root/ginseng-root.jpg` |
| ginseng-tea | `media/images/ginseng-tea/ginseng-tea.jpg` |
| hawthorn | `media/images/hawthorn/hawthorn.jpg` |
| jiang-huang | `media/images/jiang-huang/jiang-huang.jpg` |
| red-ginseng | `media/images/red-ginseng/red-ginseng.jpg` |
| ren-shen | `media/images/ren-shen/ren-shen.jpg` |
| sheng-jiang | `media/images/sheng-jiang/sheng-jiang.jpg` |
| turmeric-extract | `media/images/turmeric-extract/turmeric-extract.jpg` |
| turmeric-rhizome | `media/images/turmeric-rhizome/turmeric-rhizome.jpg` |
| turmeric | `media/images/turmeric/turmeric.jpg` |
| valerian | `media/images/valerian/valerian.jpg` |

**Note:** Ginger preparation now uses the plant image as fallback.

---

## 3. Priority Actions

### High Priority (Core herbs with many preparations)
1. **ginger** - 6 preparations depend on this image
2. **turmeric** - 4 preparations depend on this image
3. **ginseng** - 4 preparations depend on this image

### Medium Priority
4. **hawthorn**
5. **valerian**
6. **chamomile**

---

## 4. Recommended Images to Add

### Ginger family (highest impact)
```
media/images/ginger/ginger.jpg
media/images/dried-ginger-rhizome/dried-ginger-rhizome.jpg
media/images/dried-ginger/dried-ginger.jpg
media/images/fresh-ginger-rhizome/fresh-ginger-rhizome.jpg
media/images/ginger-tea/ginger-tea.jpg
media/images/ginger-tincture/ginger-tincture.jpg
media/images/sheng-jiang/sheng-jiang.jpg
```

### Turmeric family
```
media/images/turmeric/turmeric.jpg
media/images/fresh-turmeric/fresh-turmeric.jpg
media/images/turmeric-extract/turmeric-extract.jpg
media/images/turmeric-rhizome/turmeric-rhizome.jpg
media/images/jiang-huang/jiang-huang.jpg
```

### Ginseng family
```
media/images/ginseng-extract/ginseng-extract.jpg
media/images/ginseng-root/ginseng-root.jpg
media/images/ginseng-tea/ginseng-tea.jpg
media/images/red-ginseng/red-ginseng.jpg
media/images/ren-shen/ren-shen.jpg
```

### Other
```
media/images/chamomile/chamomile.jpg
media/images/hawthorn/hawthorn.jpg
media/images/valerian/valerian.jpg
media/images/curcumin-supplement/curcumin-supplement.jpg
media/images/zingiber-officinale/main.jpg
```

---

## 5. Validation Script

Run this script to check for missing images:

```bash
#!/bin/bash
DATA_DIR="."

echo "Checking botanical species images..."
for entity in ./entities/botanical/species/*/entity.jsonld; do
  slug=$(basename $(dirname "$entity"))
  img=$(grep -o '"image": "[^"]*"' "$entity" 2>/dev/null | sed 's/"image": "//;s/"$//')
  if [ -n "$img" ] && [ ! -f "$DATA_DIR/$img" ]; then
    echo "MISSING: $slug -> $img"
  fi
done

echo ""
echo "Checking preparation images..."
for entity in ./entities/preparations/*/entity.jsonld; do
  slug=$(basename $(dirname "$entity"))
  img=$(grep -o '"image": "[^"]*"' "$entity" 2>/dev/null | sed 's/"image": "//;s/"$//')
  if [ -n "$img" ] && [ ! -f "$DATA_DIR/$img" ]; then
    echo "MISSING: $slug -> $img"
  fi
done
```
