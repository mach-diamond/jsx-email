import { Html, Text } from 'jsx-email';
import { brand } from '../brand';
export const previewPresets = [{ name: 'One', props: { recipient: 'Alex' } }, { name: 'Two', props: { recipient: 'Sam' } }];
export default ({ recipient = 'Guest' }: { recipient?: string }) => <Html><Text>{brand.getStore()}: {recipient}</Text></Html>;
