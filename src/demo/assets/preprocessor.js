/**
 * Preprocessor function for the template rendering.
 * @param {string} markdown - The markdown content.
 * @param {Object} options - The options object.
 * @returns {Promise<string>} - The preprocessed markdown content.
 */
export default (markdown, options) => {
  return new Promise((resolve, reject) => {
    // Implement your preprocessor logic here...

    return resolve(markdown);
  });
};
