<?php

    namespace NeoxDashBoard\NeoxDashBoardBundle\DependencyInjection;

    use NeoxDashBoard\NeoxDashBoardBundle\DependencyInjection\Config\frameworkConfig;
    use NeoxDashBoard\NeoxDashBoardBundle\DependencyInjection\Config\twigComponentsConfig;
    use NeoxDashBoard\NeoxDashBoardBundle\DependencyInjection\Config\twigConfig;
    use Symfony\Component\AssetMapper\AssetMapperInterface;
    use Symfony\Component\Config\FileLocator;
    use Symfony\Component\DependencyInjection\ContainerBuilder;
    use Symfony\Component\DependencyInjection\Extension\Extension;
    use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
    use Symfony\Component\DependencyInjection\Loader\YamlFileLoader;
    use RuntimeException;

    class NeoxDashBoardExtension extends Extension implements PrependExtensionInterface
    {
        public function build(ContainerBuilder $container): void
        {
            parent::build($container);
            $this->checkDependencies($container);
        }

        public function prepend(ContainerBuilder $container): void
        {
            if ($this->isAssetMapperAvailable($container)) {
                $this->prependConfigurations($container);
            }
        }

        private function prependConfigurations(ContainerBuilder $container): void
        {
            $configurations = [
                'twig'              => TwigConfig::getConfig(),
                'twig_components'   => twigComponentsConfig::getConfig(),
                'framework'         => frameworkConfig::getConfig(),
            ];

            foreach ($configurations as $extension => $config) {
                $container->prependExtensionConfig($extension, $config);
            }

            // Set translation paths
            $container->setParameter('translator.paths', [
                '%kernel.project_dir%/src/NeoxDashboardBundle/translations',
            ]);
        }

        /**
         * @throws \Exception
         */
        public function load(array $configs, ContainerBuilder $container): void
        {
            $loader = new YamlFileLoader($container, new FileLocator(__DIR__ . '/../../config'));
            $loader->load('services.yaml');
            // Uncomment if needed
            // $loader->load('routes.yaml');

            $configuration = $this->getConfiguration($configs, $container);
            $this->processConfiguration($configuration, $configs);

        }

        private function isAssetMapperAvailable(ContainerBuilder $container): bool
        {
            $bundlesMetadata = $container->getParameter('kernel.bundles_metadata');

            return interface_exists(AssetMapperInterface::class) && isset($bundlesMetadata[ 'FrameworkBundle' ]) && is_file($bundlesMetadata[ 'FrameworkBundle' ][ 'path' ] . '/Resources/config/asset_mapper.php');
        }

        private function checkDependencies(ContainerBuilder $container): void
        {
            $dependencies = [
                'twig'                                => 'TwigBundle is not installed. Please install it to use NeoxDashBoardBundle.',
                'twig.components'                     => 'Twig components are not available. Please install them to use NeoxDashBoardBundle.',
                AssetMapperInterface::class           => 'AssetMapper is not available. Please install the required bundle.',
                'doctrine.orm.entity_manager.default' => 'Doctrine ORM is not installed. Please install DoctrineBundle to use NeoxDashBoardBundle.',
            ];

            foreach ($dependencies as $service => $errorMessage) {
                if (!$container->has($service) && !$container->hasDefinition($service)) {
                    throw new RuntimeException($errorMessage);
                }
            }
        }

    }
