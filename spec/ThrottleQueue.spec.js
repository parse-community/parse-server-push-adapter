import ThrottleQueue from '../src/ThrottleQueue.js';
import { wait } from './helper.js';

describe('ThrottleQueue', () => {
  it('processes items respecting rate limit', async () => {
    const q = new ThrottleQueue(1);
    const times = [];
    const p1 = q.enqueue({ task: () => { times.push(Date.now()) } });
    const p2 = q.enqueue({ task: () => { times.push(Date.now()) } });
    await Promise.all([p1, p2]);
    expect(times.length).toBe(2);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(900);
    expect(times[1] - times[0]).toBeLessThanOrEqual(1100);
  });

  it('drops expired items', async () => {
    const q = new ThrottleQueue(1);
    const results = [];
    const p1 = q.enqueue({ task: () => wait(1_200) });
    const p2 = q.enqueue({ task: () => { throw new Error('should not run'); }, ttl: 1 });
    const p3 = q.enqueue({ task: () => { results.push('run'); } });
    await Promise.all([p1, p2, p3]);
    expect(results).toEqual(['run']);
  });

  it('processes higher priority tasks first', async () => {
    const q = new ThrottleQueue(1);
    const results = [];

    // Block queue with task so that the queue scheduler doesn't start processing enqueued items
    // immediately; afterwards the scheduler picks the next enqueued item according to priority
    const pBlock = q.enqueue({ task: () => wait(500) });
    // Wait to ensure block item in queue has started
    await wait(100);

    const p7 = q.enqueue({ task: () => results.push('priority7'), priority: 7 });
    const p4 = q.enqueue({ task: () => results.push('priority4'), priority: 4 });
    const p2 = q.enqueue({ task: () => results.push('priority2'), priority: 2 });
    const p0 = q.enqueue({ task: () => results.push('priority0'), priority: 0 });
    const p6 = q.enqueue({ task: () => results.push('priority6'), priority: 6 });
    const p1 = q.enqueue({ task: () => results.push('priority1'), priority: 1 });
    const p3 = q.enqueue({ task: () => results.push('priority3'), priority: 3 });
    const p5 = q.enqueue({ task: () => results.push('priority5'), priority: 5 });
    await Promise.all([
      pBlock,
      p3,
      p2,
      p4,
      p7,
      p0,
      p6,
      p5,
      p1,
    ]);
    expect(results).toEqual([
      'priority7',
      'priority6',
      'priority5',
      'priority4',
      'priority3',
      'priority2',
      'priority1',
      'priority0',
    ]);
  });
});
