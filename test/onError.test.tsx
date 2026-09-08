import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import SvgUri from '../src';
// @ts-expect-error React Native does not publish types for this internal resolver.
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';

jest.mock('react-native', () => ({ View: 'View', StyleSheet: { flatten: (style: unknown) => style } }));
jest.mock('react-native/Libraries/Image/resolveAssetSource', () => ({
  __esModule: true,
  default: jest.fn((source: unknown) => source),
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'svg', Path: 'Path' }), { virtual: true });

const valid = '<svg width="10" height="10"><path d="M0 0L1 1" /></svg>';
const originalFetch = global.fetch;
let renderer: ReactTestRenderer;
let sequence = 0;
const uri = () => `https://example.test/${sequence++}.svg`;
const mount = async (props: React.ComponentProps<typeof SvgUri>) => {
  await act(async () => {
    renderer = create(<SvgUri {...props} />);
  });
};
const update = async (props: React.ComponentProps<typeof SvgUri>) => {
  await act(async () => {
    renderer.update(<SvgUri {...props} />);
  });
};
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('reports a network rejection as Error without onLoad', async () => {
  global.fetch = jest.fn().mockRejectedValue('offline');
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source: { uri: uri() }, onError, onLoad });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledWith(expect.any(Error));
  expect(onLoad).not.toHaveBeenCalled();
});

test.each([404, 500])('reports HTTP %i even when body contains valid SVG', async (status) => {
  global.fetch = jest.fn().mockResolvedValue(new Response(valid, { status }));
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source: { uri: uri() }, onError, onLoad });
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining(String(status)) }));
  expect(onLoad).not.toHaveBeenCalled();
});

test.each(['', 'not svg', '<html/>', '<svg>&unknown;</svg>'])('reports invalid remote XML: %s', async (body) => {
  global.fetch = jest.fn().mockResolvedValue(new Response(body));
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source: { uri: uri() }, onError, onLoad });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onLoad).not.toHaveBeenCalled();
});

test('reports inline XML errors and recovers with valid self-closing SVG', async () => {
  const onError = jest.fn();
  await mount({ svgXmlData: '<svg>&unknown;</svg>', onError });
  expect(onError).toHaveBeenCalledTimes(1);
  await update({ svgXmlData: '<svg/>', onError });
  expect(renderer.root.findAllByType('svg')).toHaveLength(1);
});

test('uses the latest callback while a request is pending', async () => {
  let reject!: (error: Error) => void;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((_, fail) => {
        reject = fail;
      })
  );
  const source = { uri: uri() };
  const oldError = jest.fn();
  const newError = jest.fn();
  await mount({ source, onError: oldError });
  await update({ source, onError: newError });
  await act(async () => {
    reject(new Error('offline'));
  });
  expect(oldError).not.toHaveBeenCalled();
  expect(newError).toHaveBeenCalledTimes(1);
});

test.each(['removed', 'unmounted', 'replaced'])('ignores pending failure when source is %s', async (action) => {
  let reject!: (error: Error) => void;
  global.fetch = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((_, fail) => {
          reject = fail;
        })
    )
    .mockResolvedValue(new Response(valid));
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source: { uri: uri() }, onError, onLoad });
  if (action === 'unmounted') act(() => renderer.unmount());
  else await update({ source: action === 'replaced' ? { uri: uri() } : undefined, onError, onLoad });
  await act(async () => {
    reject(new Error('stale'));
  });
  expect(onError).not.toHaveBeenCalled();
  expect(onLoad).toHaveBeenCalledTimes(action === 'replaced' ? 1 : 0);
});

test('invalid assets report an error without starting a request', async () => {
  jest.mocked(resolveAssetSource).mockReturnValueOnce(null);
  global.fetch = jest.fn();
  const onError = jest.fn();
  await mount({ source: 123, onError });
  expect(onError).toHaveBeenCalledWith(expect.any(Error));
  expect(global.fetch).not.toHaveBeenCalled();
});

test('evicts failed requests so remounting retries successfully', async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(new Response(valid));
  const source = { uri: uri() };
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source, onError, onLoad });
  act(() => renderer.unmount());
  await mount({ source, onError, onLoad });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType('svg')).toHaveLength(1);
});

test('successful shared requests notify each mounted consumer and use the latest onLoad', async () => {
  let resolve!: (response: Response) => void;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      })
  );
  const source = { uri: uri() };
  const firstLoad = jest.fn();
  const latestLoad = jest.fn();
  const secondLoad = jest.fn();
  const onError = jest.fn();
  await mount({ source, onLoad: firstLoad, onError });
  let second!: ReactTestRenderer;
  await act(async () => {
    second = create(<SvgUri source={source} onLoad={secondLoad} onError={onError} />);
  });
  try {
    await update({ source, onLoad: latestLoad, onError });
    await act(async () => {
      resolve(new Response(valid));
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(firstLoad).not.toHaveBeenCalled();
    expect(latestLoad).toHaveBeenCalledTimes(1);
    expect(secondLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  } finally {
    act(() => second.unmount());
  }
});

test.each(['http', 'xml', 'body'])('retries after %s failure', async (failure) => {
  const failed = failure === 'http' ? new Response(valid, { status: 500 }) : failure === 'xml' ? new Response('<html/>') : new Response(valid);
  if (failure === 'body') await failed.text(); // A consumed response rejects text().
  global.fetch = jest.fn().mockResolvedValueOnce(failed).mockResolvedValue(new Response(valid));
  const source = { uri: uri() };
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source, onError, onLoad });
  act(() => renderer.unmount());
  await mount({ source, onError, onLoad });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType('svg')).toHaveLength(1);
});

test('does not replay an inline error when only the callback or dimensions change', async () => {
  const onError = jest.fn();
  const nextError = jest.fn();
  await mount({ svgXmlData: '<html/>', onError });
  await update({ svgXmlData: '<html/>', onError: nextError, width: 20 });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(nextError).not.toHaveBeenCalled();
});

test('preserves resolver errors', async () => {
  const error = new Error('missing asset');
  jest.mocked(resolveAssetSource).mockImplementationOnce(() => {
    throw error;
  });
  const onError = jest.fn();
  await mount({ source: 456, onError });
  expect(onError).toHaveBeenCalledWith(error);
});

test('handles invalid XML without an onError callback', async () => {
  await mount({ svgXmlData: '<html/>' });
  expect(renderer.root.findAllByType('svg')).toHaveLength(0);
});

test('accepts SVG declarations and comments without reporting an error', async () => {
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ svgXmlData: `<?xml version="1.0"?><!-- icon -->${valid}`, onError, onLoad });
  expect(renderer.root.findAllByType('svg')).toHaveLength(1);
  expect(onError).not.toHaveBeenCalled();
  expect(onLoad).not.toHaveBeenCalled();
});

test('does not reload the same URI when callback and source object identities change', async () => {
  global.fetch = jest.fn().mockResolvedValue(new Response(valid));
  const url = uri();
  const onLoad = jest.fn();
  const nextLoad = jest.fn();
  await mount({ source: { uri: url }, onLoad });
  await update({ source: { uri: url }, onLoad: nextLoad, onError: jest.fn() });
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(nextLoad).not.toHaveBeenCalled();
});

test.each(['<svg/><svg/>', '<svg/>junk', 'junk<svg/>'])('rejects content outside a single SVG root: %s', async (body) => {
  global.fetch = jest.fn().mockResolvedValue(new Response(body));
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source: { uri: uri() }, onError, onLoad });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onLoad).not.toHaveBeenCalled();
});

test.each(['<svg><path></svg>', '<svg width=10/>'])('renders repaired inline XML with warnings: %s', async (xml) => {
  const onError = jest.fn();
  await mount({ svgXmlData: xml, onError });
  expect(renderer.root.findAllByType('svg')).toHaveLength(1);
  expect(onError).not.toHaveBeenCalled();
});

test('calls onLoad for a remote SVG repaired with warnings', async () => {
  global.fetch = jest.fn().mockResolvedValue(new Response('<svg><path></svg>'));
  const onError = jest.fn();
  const onLoad = jest.fn();
  await mount({ source: { uri: uri() }, onError, onLoad });
  expect(renderer.root.findAllByType('svg')).toHaveLength(1);
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});

test.each([
  ['onError', false],
  ['onError', true],
  ['onLoad', false],
  ['onLoad', true],
] as const)('uses the committed %s callback when the transition commits: %s', async (event, shouldCommit) => {
  const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previousActEnvironment = environment.IS_REACT_ACT_ENVIRONMENT;
  environment.IS_REACT_ACT_ENVIRONMENT = true;
  let succeed!: (response: Response) => void;
  let fail!: (error: Error) => void;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((resolve, reject) => {
        succeed = resolve;
        fail = reject;
      })
  );
  const source = { uri: uri() };
  const oldCallback = jest.fn();
  const newCallback = jest.fn();
  const commits: boolean[] = [];
  let blockedRenders = 0;
  const pending = new Promise<never>(() => {});
  const Gate = ({ blocked }: { blocked: boolean }) => {
    if (blocked) {
      blockedRenders++;
      throw pending;
    }
    return null;
  };
  const App = ({ changed }: { changed: boolean }) => {
    React.useLayoutEffect(() => {
      commits.push(changed);
    }, [changed]);
    return (
      <React.Suspense fallback={null}>
        <SvgUri source={source} {...{ [event]: changed ? newCallback : oldCallback }} />
        <Gate blocked={changed && !shouldCommit} />
      </React.Suspense>
    );
  };
  const options: NonNullable<Parameters<typeof create>[1]> & { unstable_isConcurrent: boolean } = {
    unstable_isConcurrent: true,
    createNodeMock: () => null,
  };
  try {
    await act(async () => {
      renderer = create(<App changed={false} />, options);
    });
    await act(async () => {
      React.startTransition(() => {
        renderer.update(<App changed />);
      });
    });
    expect(commits).toEqual(shouldCommit ? [false, true] : [false]);
    if (!shouldCommit) expect(blockedRenders).toBeGreaterThan(0);
    await act(async () => {
      if (event === 'onLoad') succeed(new Response(valid));
      else fail(new Error('offline'));
    });
    expect(oldCallback).toHaveBeenCalledTimes(shouldCommit ? 0 : 1);
    expect(newCallback).toHaveBeenCalledTimes(shouldCommit ? 1 : 0);
    expect(commits).toEqual(shouldCommit ? [false, true] : [false]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => {
      renderer.unmount();
    });
    if (previousActEnvironment === undefined) delete environment.IS_REACT_ACT_ENVIRONMENT;
    else environment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
});
