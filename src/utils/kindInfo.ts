/** What each entry kind means, in words a visitor who has never seen the protocol can follow. */
const DESCRIPTIONS: Record<string, string> = {
  'identity.created': 'A new identity was created.',
  'identity.passkey_registered': 'A passkey was added to an identity so it can sign in.',
  'identity.passkey_revoked': 'A passkey was removed from an identity.',
  'identity.signing_key_added': 'A signing key was added to an identity; it signs that identity’s actions.',
  'identity.signing_key_revoked': 'A signing key was removed from an identity.',
  'identity.recovery_configured': 'Account recovery was set up for an identity.',
  'identity.recovery_requested': 'Recovery of an identity was requested.',
  'identity.recovery_approved': 'A recovery request for an identity was approved.',
  'identity.recovery_cancelled': 'A recovery request for an identity was cancelled.',
  'identity.recovered': 'An identity was recovered onto a new key.',
  'profile.updated': 'An identity changed its profile, such as its display name.',
  'friend.requested': 'One identity asked another to be friends.',
  'friend.accepted': 'A friend request was accepted.',
  'friend.removed': 'A friendship was ended.',
  'friend.relationship_reversed': 'An earlier friendship change was reversed.',
  'guild.created': 'A guild (a group of identities) was created.',
  'guild.updated': 'A guild’s details were changed.',
  'guild.member_added': 'An identity joined a guild.',
  'guild.member_removed': 'An identity left or was removed from a guild.',
  'guild.membership_reversed': 'An earlier guild membership change was reversed.',
  'guild.role_defined': 'A role was defined in a guild.',
  'guild.role_changed': 'A member’s role in a guild changed.',
  'guild.role_deleted': 'A role was removed from a guild.',
  'guild.owner_transferred': 'A guild changed owner.',
  'guild.channel_created': 'A channel was created in a guild.',
  'guild.channel_renamed': 'A guild channel was renamed.',
  'guild.channel_archived': 'A guild channel was archived.',
  'guild.game_associated': 'A game was linked to a guild.',
  'guild.favorite_games_updated': 'A guild changed its favorite games.',
  'game.registered': 'A game registered with the network.',
  'game.binding_established': 'An identity was linked to a game.',
  'game.binding_ended': 'An identity’s link to a game was ended.',
  'game_schema.published': 'A game published a data schema.',
  'game_schema_mapping.published': 'A game published a mapping between data schemas.',
  'game_data.published': 'A game published data.',
  'game_data.deleted': 'A game removed data it had published.',
  'achievement.defined': 'An achievement was defined.',
  'achievement.definition_updated': 'An achievement’s definition was changed.',
  'achievement.definition_retired': 'An achievement was retired.',
  'achievement.issued': 'An achievement was awarded to an identity.',
  'achievement.revoked': 'An awarded achievement was taken back.',
  'integrator.recognition_published': 'An integrator published a recognition of an identity.',
  'integrator.recognition_revoked': 'An integrator took back a recognition.',
}

/** A sentence for the kind; unknown kinds get a generic one so a new kind never shows up blank. */
export function describeKind(kind: string): string {
  const known = DESCRIPTIONS[kind]
  if (known) return known
  const [area, action] = kind.split('.')
  return action ? `A ${area.replace(/_/g, ' ')} event: ${action.replace(/_/g, ' ')}.` : `An event of kind ${kind}.`
}
