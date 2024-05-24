'use client';

import {ReactNode, useEffect, useRef, useState} from 'react';
import {QuestionMarkCircledIcon} from '@radix-ui/react-icons';
import * as Tooltip from '@radix-ui/react-tooltip';
import {Button, Checkbox, Theme} from '@radix-ui/themes';

import styles from './styles.module.scss';

const optionDetails: Record<
  OptionId,
  {
    description: ReactNode;
    name: string;
    deps?: OptionId[];
  }
> = {
  'error-monitoring': {
    name: 'Error Monitoring',
    description: "Let's admit it, we all have errors.",
  },
  performance: {
    name: 'Performance Monitoring',
    description: (
      <span>
        Automatic performance issue detection across services and context on who is
        impacted, outliers, regressions, and the root cause of your slowdown.
      </span>
    ),
  },
  profiling: {
    name: 'Profiling',
    description: (
      <span>
        <b>Requires Performance Monitoring</b> <br /> See the exact lines of code causing
        your performance bottlenecks, for faster troubleshooting and resource
        optimization.
      </span>
    ),
    deps: ['performance'],
  },
  'session-replay': {
    name: 'Session Replay',
    description: (
      <span>
        Video-like reproductions of user sessions with debugging context to help you
        confirm issue impact and troubleshoot faster.
      </span>
    ),
  },
};

const OPTION_IDS = [
  'error-monitoring',
  'performance',
  'profiling',
  'session-replay',
] as const;

type OptionId = (typeof OPTION_IDS)[number];

type OnboardingOptionType = {
  /**
   * Unique identifier for the option, will control the visibility
   * of `<OnboardingOption optionId="this_id"` /> somewhere on the page
   * or lines of code specified in in a `{onboardingOptions: {this_id: 'line-range'}}` in a code block meta
   */
  id: OptionId;
  checked?: boolean;
  disabled?: boolean;
};

const validateOptionIds = (options: Pick<OnboardingOptionType, 'id'>[]) => {
  options.forEach(option => {
    if (!OPTION_IDS.includes(option.id)) {
      throw new Error(
        `Invalid option id: ${option.id}.\nValid options are: ${OPTION_IDS.map(opt => `"${opt}"`).join(', ')}`
      );
    }
  });
};

export function OnboardingOption({
  children,
  optionId,
}: {
  children: React.ReactNode;
  optionId: OptionId;
}) {
  validateOptionIds([{id: optionId}]);
  return (
    <div data-onboarding-option={optionId} className="hidden">
      {children}
    </div>
  );
}

export function OnboardingOptionButtons({
  options: initialOptions,
}: {
  // convenience type to allow passing option ids as strings when no additional config is required
  options: (OnboardingOptionType | OptionId)[];
}) {
  const normalizedOptions = initialOptions.map(option => {
    if (typeof option === 'string') {
      return {id: option};
    }
    return option;
  });

  validateOptionIds(normalizedOptions);

  const [options, setSelectedOptions] = useState<
    (OnboardingOptionType & {checked: boolean})[]
  >(normalizedOptions.map(option => ({...option, checked: Boolean(option.checked)})));

  function handleCheckedChange(clickedOption: OnboardingOptionType, checked: boolean) {
    setSelectedOptions(prev => {
      // - select option and all dependencies
      // - disable dependencies
      if (checked) {
        return prev.map(opt => {
          if (opt.id === clickedOption.id) {
            return {
              ...opt,
              checked: true,
            };
          }
          if (optionDetails[clickedOption.id].deps?.includes(opt.id)) {
            return {...opt, disabled: true, checked: true};
          }
          return opt;
        });
      }
      // unselect option and reenable dependencies
      // Note: does not account for dependencies of multiple dependants
      return prev.map(opt => {
        if (opt.id === clickedOption.id) {
          return {
            ...opt,
            checked: false,
          };
        }
        // reenable dependencies
        return optionDetails[clickedOption.id].deps?.includes(opt.id)
          ? {...opt, disabled: false}
          : opt;
      });
    });
  }
  useEffect(() => {
    options.forEach(option => {
      if (option.disabled) {
        return;
      }
      const targetElements = document.querySelectorAll<HTMLDivElement>(
        `[data-onboarding-option="${option.id}"]`
      );
      targetElements.forEach(el => {
        el.classList.toggle('hidden', !option.checked);
      });
      if (option.checked && optionDetails[option.id].deps?.length) {
        const dependenciesSelecor = optionDetails[option.id].deps!.map(
          dep => `[data-onboarding-option="${dep}"]`
        );
        const dependencies = document.querySelectorAll<HTMLDivElement>(
          dependenciesSelecor.join(', ')
        );

        dependencies.forEach(dep => {
          dep.classList.remove('hidden');
        });
      }
    });
  }, [options]);

  const buttonsRef = useRef<HTMLDivElement>(null);
  const containerTopPx = 100;
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      function ([buttonsContainer]) {
        setIsSticky(!buttonsContainer.isIntersecting);
      },
      {
        // the 1 exptra px is important to trigger the observer
        // https://stackoverflow.com/questions/16302483/event-to-detect-when-positionsticky-is-triggered
        rootMargin: `-${containerTopPx + 1}px 0px 0px 0px`,
        threshold: [1],
      }
    );

    observer.observe(buttonsRef.current!);
  }, []);

  // TW chokes on plain ${number}px
  const containerTopStr = `${containerTopPx}px`;
  return (
    <div
      ref={buttonsRef}
      className={`flex gap-4 py-2 bg-white/90 sticky top-[${containerTopStr}] z-[1000] rounded shadow-[var(--shadow-6)] transition ${
        isSticky ? 'px-2 backdrop-blur' : ''
      }`}
    >
      {options.map(option => (
        <Button
          variant="surface"
          size="2"
          disabled={option.disabled}
          asChild
          key={option.id}
        >
          <label role="button">
            <Checkbox
              defaultChecked={option.disabled}
              checked={option.checked}
              disabled={option.disabled}
              variant="soft"
              size="1"
              onCheckedChange={ev => {
                handleCheckedChange(option, ev as boolean);
              }}
            />

            {optionDetails[option.id].name}
            {optionDetails[option.id] && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <QuestionMarkCircledIcon fontSize={20} strokeWidth="2" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Theme accentColor="iris">
                      <Tooltip.Content className={styles.TooltipContent} sideOffset={5}>
                        {optionDetails[option.id].description}
                        <Tooltip.Arrow className={styles.TooltipArrow} />
                      </Tooltip.Content>
                    </Theme>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </label>
        </Button>
      ))}
    </div>
  );
}
