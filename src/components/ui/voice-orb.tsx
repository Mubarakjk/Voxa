import { VoxaOrb } from './voxa-orb';

type Props = {
  size?: number;
  active?: boolean;
  tint?: string;
};

/** @deprecated Prefer VoxaOrb — kept for backward compatibility */
export function VoiceOrb({ size = 180, active = true, tint }: Props) {
  return <VoxaOrb size={size} active={active} tint={tint} />;
}

export { VoxaOrb, VoxaOrbHero, VoxaOrbLarge, VoxaOrbMedium, VoxaOrbSmall } from './voxa-orb';
