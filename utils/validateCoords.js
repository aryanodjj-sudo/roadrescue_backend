// Shared by the REST layer (service request creation) and the socket
// layer (mechanic:location) so both reject bad coordinates the same way.
export function isValidCoord(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}