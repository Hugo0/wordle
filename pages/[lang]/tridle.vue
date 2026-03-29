<script setup lang="ts">
/**
 * Tridle is deprecated — redirect to Quordle.
 */
definePageMeta({ layout: false });

const route = useRoute();
const lang = route.params.lang as string;

await navigateTo(`/${lang}/quordle`, { redirectCode: 301 });
</script>
