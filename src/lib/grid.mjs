// How many columns a closing CTA card spans so the last row of a grid is full.
// A complete row gets a full-width CTA row.
export function ctaSpan(count, cols) {
  return count % cols === 0 ? cols : cols - (count % cols);
}
