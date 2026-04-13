<template>
    <NuxtLink
        v-if="href && !disabled"
        :to="href"
        class="sidebar-item w-full"
        :class="{ 'sidebar-item-active': active }"
        @click="handleClick"
    >
        <span class="item-icon w-5 text-center flex items-center justify-center">
            <component :is="iconComponent" :size="18" class="text-current" />
        </span>
        <span class="flex-1 text-sm" :class="active ? 'font-semibold text-ink' : 'text-ink'">
            {{ label }}
        </span>
        <span
            v-if="badge"
            class="ml-auto font-mono text-[10px] tracking-wide px-1.5 py-px"
            :class="badge === 'NEW' ? 'bg-accent text-white' : 'bg-muted-soft text-muted'"
        >
            {{ badge }}
        </span>
    </NuxtLink>
    <button
        v-else
        class="sidebar-item w-full"
        :class="{
            'sidebar-item-active': active,
            'opacity-50 cursor-not-allowed': disabled,
        }"
        :disabled="disabled || undefined"
        @click="!disabled && $emit('click')"
    >
        <span class="item-icon w-5 text-center flex items-center justify-center">
            <component :is="iconComponent" :size="18" class="text-current" />
        </span>
        <span class="flex-1 text-sm" :class="active ? 'font-semibold text-ink' : 'text-ink'">
            {{ label }}
        </span>
        <span
            v-if="badge"
            class="ml-auto font-mono text-[10px] tracking-wide px-1.5 py-px"
            :class="badge === 'NEW' ? 'bg-accent text-white' : 'bg-muted-soft text-muted'"
        >
            {{ badge }}
        </span>
    </button>
</template>

<script setup lang="ts">
import {
    Square,
    Infinity as InfinityIcon,
    Bug,
    Columns2,
    Columns3,
    Grid2x2,
    Zap,
    Compass,
    BarChart2,
    ChartNoAxesCombined,
    Award,
    Calendar,
    Settings,
    PenLine,
    Users,
    Trophy,
} from 'lucide-vue-next';

const props = withDefaults(
    defineProps<{
        // Lucide components are render functions, so we accept callables too.
        icon: string | object | ((...args: any[]) => any);
        label: string;
        badge?: string;
        active?: boolean;
        disabled?: boolean;
        href?: string;
    }>(),
    {
        badge: undefined,
        active: false,
        disabled: false,
        href: undefined,
    }
);

const emit = defineEmits<{ click: [] }>();

const route = useRoute();

function handleClick() {
    emit('click');
    // If the href has a hash and we're already on the same page, scroll to the element
    if (props.href?.includes('#')) {
        const [path, hash] = props.href.split('#');
        if (route.path === path || (!path && route.hash === `#${hash}`)) {
            nextTick(() => {
                document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }
}

const iconMap: Record<string, any> = {
    Square,
    Infinity: InfinityIcon,
    Bug,
    Columns2,
    Columns3,
    Grid2x2,
    Zap,
    Compass,
    BarChart2,
    ChartNoAxesCombined,
    Award,
    Calendar,
    Settings,
    PenLine,
    Users,
    Trophy,
};

// Accept either a string (looked up in iconMap) or a component directly
const iconComponent = computed(() =>
    typeof props.icon === 'string' ? iconMap[props.icon] || Square : props.icon
);
</script>

<style scoped>
.sidebar-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    cursor: pointer;
    font-size: 14px;
    transition:
        background 0.15s,
        border-color 0.15s;
    border-left: 3px solid transparent;
    text-align: start;
    text-decoration: none;
}
[dir='rtl'] .sidebar-item {
    border-left: none;
    border-right: 3px solid transparent;
}
.sidebar-item:hover:not(:disabled) {
    background: var(--color-paper-warm);
}
.sidebar-item-active {
    background: var(--color-paper-warm);
    border-left-color: var(--color-ink);
    font-weight: 600;
}
[dir='rtl'] .sidebar-item-active {
    border-left-color: transparent;
    border-right-color: var(--color-ink);
}
</style>
