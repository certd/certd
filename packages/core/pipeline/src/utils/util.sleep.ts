export default function (timeout: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({});
    }, timeout);
  });
}
