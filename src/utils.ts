export const camelCase = (value: string): string =>
  value.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

export const camelCaseNodeName = ({
  nodeName,
  nodeValue,
}: {
  nodeName: string;
  nodeValue: string;
}): { nodeName: string; nodeValue: string } => ({ nodeName: camelCase(nodeName), nodeValue });

export const removePixelsFromNodeValue = ({
  nodeName,
  nodeValue,
}: {
  nodeName: string;
  nodeValue: string;
}): { nodeName: string; nodeValue: string } => ({ nodeName, nodeValue: nodeValue.replace('px', '') });

export const transformStyle = ({
  nodeName,
  nodeValue,
  fillProp,
}: {
  nodeName: string;
  nodeValue: string;
  fillProp?: string;
}): Record<string, string> | null => {
  if (nodeName === 'style') {
    return nodeValue.split(';').reduce<Record<string, string>>((acc, attribute) => {
      const [property, value] = attribute.split(':');
      if (property === '' || value === undefined) return acc;
      return { ...acc, [camelCase(property)]: fillProp && property === 'fill' ? fillProp : value };
    }, {});
  }
  return null;
};

export const getEnabledAttributes =
  (enabledAttributes: string[]) =>
  ({ nodeName }: { nodeName: string }): boolean =>
    enabledAttributes.includes(camelCase(nodeName));
